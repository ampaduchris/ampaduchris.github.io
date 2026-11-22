// Computes src/data/method.json, mark.json and upstream.json from public sources (spec 7).
//
//   npm run numbers                      fetch live from GitHub, write snapshot.json and the three outputs
//   npm run numbers -- --from-snapshot   recompute the outputs from the committed snapshot
//   npm run numbers -- --check           with --from-snapshot: fail if the committed outputs differ (CI)
//   npm run numbers -- --live --check    fetch live and fail if the committed outputs differ (the reader's check)
//
// Needs the gh CLI, logged in, for live fetches. The only network access in this repository's data path.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { loadProjects, loadSite } from '../src/lib/data';
import { CUTOFF, computeNumbers, serialise, type Commit, type PrRecord, type RepoSource, type Snapshot, type UpstreamPr } from '../src/lib/numbers';

const OUT = 'src/data';
// NUMBERS_SITE_REF names a branch of this site's repository whose BUILD-LOG.md is read in place of the default branch's. A notes session cites its own
// build-log row, which is on the pull request's branch until the merge (DEV-052). The ref is recorded in the queries.
const SITE_REF = process.env.NUMBERS_SITE_REF;
const args = new Set(process.argv.slice(2));

function api(path: string, opts: { paginate?: boolean } = {}): any {
  const a = ['api', ...(opts.paginate ? ['--paginate', '--slurp'] : []), path];
  try {
    const out = JSON.parse(execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] }));
    return opts.paginate ? (out as any[]).flat() : out;
  } catch (e) {
    const msg = String((e as { stderr?: string }).stderr ?? e);
    if (msg.includes('404')) return null;
    throw new Error(`gh api ${path} failed: ${msg.split('\n')[0]}`);
  }
}

function fetchSnapshot(): Snapshot {
  const site = loadSite();
  const owner = new URL(site.github_url).pathname.replace(/\//g, '');
  const siteRepo = new URL(site.repo_url).pathname.slice(1);
  const repos = [...loadProjects().map((p) => p.repo), siteRepo];
  const queries: string[] = [];
  const q = (s: string) => { queries.push(`gh api ${s}`); return s; };
  const sources: RepoSource[] = [];
  for (const repo of repos) {
    const ref = repo === siteRepo && SITE_REF ? SITE_REF : null;
    const head = api(q(`repos/${repo}/commits/${ref ?? 'HEAD'}`));
    const log = api(q(`repos/${repo}/contents/docs/BUILD-LOG.md${ref ? `?ref=${ref}` : ''}`));
    const commits: Commit[] = (api(q(`repos/${repo}/commits?since=${CUTOFF}T00:00:00Z&per_page=100`), { paginate: true }) ?? []).map((c: any) => ({
      sha: c.sha, date: c.commit.author.date, parents: c.parents.length,
      coauthor_lines: String(c.commit.message).split('\n').filter((l) => /^co-authored-by:/i.test(l)).map((l) => l.trim()),
    }));
    const prs: PrRecord[] = [];
    const list = api(q(`repos/${repo}/pulls?state=all&per_page=100`), { paginate: true }) ?? [];
    for (const p of list) {
      if (p.created_at.slice(0, 10) < CUTOFF) continue;
      const rec: PrRecord = {
        number: p.number, title: p.title, url: p.html_url, state: p.merged_at ? 'merged' : p.state === 'open' ? 'open' : 'closed',
        author: p.user.login, created_at: p.created_at, merged_at: p.merged_at ?? null, merged_by: null, ready_at: null, owner_comment_times: [],
      };
      if (rec.state === 'merged' && rec.author === owner) {
        rec.merged_by = api(q(`repos/${repo}/pulls/${p.number}`))?.merged_by?.login ?? null;
        const ready = (api(q(`repos/${repo}/issues/${p.number}/timeline?per_page=100`), { paginate: true }) ?? []).filter((e: any) => e.event === 'ready_for_review');
        rec.ready_at = ready.length ? ready[ready.length - 1].created_at : null;
        const times: string[] = [];
        for (const e of api(q(`repos/${repo}/issues/${p.number}/comments?per_page=100`), { paginate: true }) ?? []) if (e.user?.login === owner) times.push(e.created_at);
        for (const e of api(q(`repos/${repo}/pulls/${p.number}/comments?per_page=100`), { paginate: true }) ?? []) if (e.user?.login === owner) times.push(e.created_at);
        for (const e of api(q(`repos/${repo}/pulls/${p.number}/reviews?per_page=100`), { paginate: true }) ?? []) if (e.user?.login === owner && e.submitted_at) times.push(e.submitted_at);
        rec.owner_comment_times = times.sort();
      }
      prs.push(rec);
    }
    prs.sort((a, b) => a.number - b.number);
    sources.push({
      repo, build_log_commit: head?.sha ?? null,
      build_log: log?.content ? Buffer.from(log.content, 'base64').toString('utf8') : null,
      commits: commits.sort((a, b) => (a.sha < b.sha ? -1 : 1)), prs,
    });
  }
  const found = api(q(`search/issues?q=type:pr+author:${owner}+-user:${owner}&per_page=100`));
  const upstream: UpstreamPr[] = (found?.items ?? []).map((i: any) => ({
    repo: String(i.repository_url).replace('https://api.github.com/repos/', ''), number: i.number, title: i.title, url: i.html_url,
    state: i.pull_request?.merged_at ? 'merged' : i.state === 'open' ? 'open' : 'closed', created_at: i.created_at, merged_at: i.pull_request?.merged_at ?? null,
  }));
  return { generated_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), cutoff: CUTOFF, owner, queries, repos: sources, upstream };
}

const files = (out: ReturnType<typeof computeNumbers>) => ({ 'method.json': serialise(out.method), 'mark.json': serialise(out.mark), 'upstream.json': serialise(out.upstream) });
const stripTime = (text: string) => text.replace(/"generated_at": "[^"]*"/, '"generated_at": ""');

let snapshot: Snapshot;
if (args.has('--from-snapshot')) snapshot = JSON.parse(readFileSync(`${OUT}/snapshot.json`, 'utf8'));
else snapshot = fetchSnapshot();
const out = files(computeNumbers(snapshot));

if (args.has('--check')) {
  // Against the snapshot the match is exact. Against a live fetch the time stamp is ignored and new activity shows as a difference.
  const live = args.has('--live');
  const differs = Object.entries(out).filter(([name, text]) => {
    const committed = readFileSync(`${OUT}/${name}`, 'utf8');
    return live ? stripTime(committed) !== stripTime(text) : committed !== text;
  }).map(([name]) => name);
  for (const d of differs) console.log(`${d}: differs from the ${live ? 'live sources' : 'snapshot'}`);
  console.log(differs.length ? `${differs.length} file(s) differ` : 'outputs match');
  process.exit(differs.length ? 1 : 0);
}
if (!args.has('--from-snapshot')) writeFileSync(`${OUT}/snapshot.json`, serialise(snapshot));
for (const [name, text] of Object.entries(out)) writeFileSync(`${OUT}/${name}`, text);
console.log(`wrote snapshot.json (${snapshot.repos.length} repositories) and ${Object.keys(out).join(', ')}`);
