// Every number on the site is computed here from two kinds of source (spec 7): the docs/BUILD-LOG.md of each
// listed repository and of the site repository, and GitHub's pull request records. Pure functions: no file or
// network access. scripts/numbers.ts fetches the sources and writes the outputs.

export const CUTOFF = '2026-11-15';
export const MEDIAN_MIN_N = 20;

export interface Commit { sha: string; date: string; parents: number; coauthor_lines: string[] }
export interface PrRecord {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  author: string;
  created_at: string;
  merged_at: string | null;
  merged_by: string | null;
  ready_at: string | null; // the last ready_for_review event; null when the pull request was never a draft
  owner_comment_times: string[];
}
export interface RepoSource {
  repo: string;
  build_log: string | null; // text of docs/BUILD-LOG.md on the default branch
  build_log_commit: string | null;
  commits: Commit[]; // default branch, on or after the cut-off
  prs: PrRecord[]; // every pull request opened on or after the cut-off, any author
}
export interface UpstreamPr { repo: string; number: number; title: string; url: string; state: 'open' | 'closed' | 'merged'; created_at: string; merged_at: string | null }
export interface Snapshot {
  generated_at: string;
  cutoff: string;
  owner: string;
  queries: string[]; // the commands used, recorded for the reader
  repos: RepoSource[];
  upstream: UpstreamPr[];
}

export interface LogRow {
  repo: string;
  session: string;
  model: string; // as the log spells it, without a parenthetical note
  effort: string;
  pair: string; // "Model / effort"
  minutes: number | null;
  not_verified: number;
  pr_number: number | null;
}

const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

/** Reads the table rows of a build log. A log with no table (older format) gives no rows. */
export function parseBuildLog(repo: string, text: string | null): LogRow[] {
  if (!text) return [];
  const rows: LogRow[] = [];
  for (const line of text.split('\n')) {
    if (!/^\|\s*20\d\d-\d\d-\d\d\s*\|/.test(line)) continue;
    const c = line.split('|').slice(1, -1).map((x) => x.trim());
    if (c.length < 8) continue;
    const model = c[2].replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    const effort = (c[3].toLowerCase().match(new RegExp(`\\b(${EFFORTS.join('|')})\\b`)) ?? [''])[0];
    const minutes = c[4].match(/\d+/);
    const nv = c[6].match(/\d+/);
    const pr = c[7].match(/\/pull\/(\d+)/);
    rows.push({
      repo, session: c[1], model, effort, pair: `${model} / ${effort}`,
      minutes: minutes ? Number(minutes[0]) : null,
      not_verified: nv ? Number(nv[0]) : 0,
      pr_number: pr ? Number(pr[1]) : null,
    });
  }
  return rows;
}

export function isOwn(pr: PrRecord, owner: string, cutoff: string): boolean {
  return pr.author === owner && pr.created_at.slice(0, 10) >= cutoff;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

export const hoursBetween = (from: string, to: string): number => (Date.parse(to) - Date.parse(from)) / 3_600_000;
export const oneDp = (n: number): number => Math.round(n * 10) / 10;

export type StatValue = number | string | null | { name: string; sessions: number }[];
export interface Stat { id: string; value: StatValue; n: number; label: string; definition: string }
export interface Recent {
  repo: string; number: number; title: string; url: string; state: 'open' | 'closed' | 'merged';
  model: string | null; effort: string | null; minutes: number | null; hours_to_merge: number | null; date: string;
}
export interface MethodJson {
  generated_at: string;
  cutoff: string;
  sources: SourceRecord[];
  counts: { build_log_rows: number; pull_requests: number };
  stats: Stat[];
  recent: Recent[];
}
export interface MarkRecord {
  session: string; model: string; effort: string; minutes: number | null; not_verified: number;
  pr_number: number | null; state: string; merged_by_owner: boolean; hours_to_merge: number | null;
}
export interface SourceRecord { repo: string; build_log_commit: string | null; queries: string[] }
export interface MarkJson {
  generated_at: string; cutoff: string; sources: SourceRecord[];
  // log: 'table' when the build log has rows, 'not-table' when it exists without a row table, 'missing' when there is none.
  projects: { repo: string; log: 'table' | 'not-table' | 'missing'; sessions: MarkRecord[] }[];
  upstream: { repo: string; number: number; state: 'open' | 'closed' | 'merged' }[];
}
export interface UpstreamJson {
  generated_at: string; cutoff: string; queries: string[];
  prs: { repo: string; number: number; title: string; url: string; merged_at: string }[];
}

const naming = /^co-authored-by:.*\b(claude|sonnet|opus|haiku|fable|gpt|gemini)\b/i;

function hoursToMerge(pr: PrRecord): number | null {
  if (pr.state !== 'merged' || !pr.merged_at) return null;
  return oneDp(hoursBetween(pr.ready_at ?? pr.created_at, pr.merged_at));
}

export function computeNumbers(s: Snapshot): { method: MethodJson; mark: MarkJson; upstream: UpstreamJson } {
  const rows = s.repos.flatMap((r) => parseBuildLog(r.repo, r.build_log));
  const ownPrs = s.repos.flatMap((r) => r.prs.filter((p) => isOwn(p, s.owner, s.cutoff)).map((p) => ({ repo: r.repo, pr: p })));
  const closedOrMerged = ownPrs.filter((x) => x.pr.state !== 'open');
  const merged = ownPrs.filter((x) => x.pr.state === 'merged');
  const mergedByOwner = merged.filter((x) => x.pr.merged_by === s.owner);
  const commented = merged.filter((x) => x.pr.owner_comment_times.some((t) => t < (x.pr.merged_at as string)));
  const commits = s.repos.flatMap((r) => r.commits).filter((c) => c.parents <= 1 && c.date.slice(0, 10) >= s.cutoff);
  const agentCommits = commits.filter((c) => c.coauthor_lines.some((l) => naming.test(l)));
  const hours = merged.map((x) => hoursToMerge(x.pr)).filter((h): h is number => h !== null);
  const med = median(hours);
  const upMerged = s.upstream.filter((u) => u.state === 'merged');
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.pair, (counts.get(r.pair) ?? 0) + 1);
  const models = [...counts.entries()].map(([name, sessions]) => ({ name, sessions })).sort((a, b) => b.sessions - a.sessions || a.name.localeCompare(b.name));

  const stats: Stat[] = [
    { id: 'sessions', value: rows.length, n: rows.length, label: 'agent sessions logged', definition: 'Rows in the build logs of the listed repositories and the site repository.' },
    { id: 'agent_commits', value: `${agentCommits.length} of ${commits.length}`, n: commits.length, label: "commits carry a model's co-author line", definition: 'Commits on the default branch of each listed repository and the site repository, on or after the cut-off date, merge commits excluded, whose message has a Co-Authored-By line naming a model.' },
    { id: 'prs_merged', value: `${mergedByOwner.length} of ${closedOrMerged.length}`, n: closedOrMerged.length, label: 'pull requests opened by the agent and merged by me', definition: 'Own pull requests whose state is merged and whose merger is the owner\'s account, out of own pull requests that are closed or merged.' },
    { id: 'prs_commented', value: `${commented.length} of ${merged.length}`, n: merged.length, label: 'merged with my written check', definition: 'Merged own pull requests on which the owner\'s account left a comment before the merge time. The agent and the owner share one account, so this cannot tell who wrote the comment.' },
    { id: 'hours_to_merge', value: merged.length >= MEDIAN_MIN_N && med !== null ? oneDp(med) : null, n: merged.length, label: 'median hours from ready for review to merge', definition: 'Median over merged own pull requests of merge time minus the time the pull request was last marked ready for review, or opened if it was never a draft. Shown from 20 pull requests.' },
    { id: 'not_verified', value: rows.reduce((a, r) => a + r.not_verified, 0), n: rows.length, label: 'checks reported as not verified', definition: 'Sum of the NOT VERIFIED column over all build-log rows.' },
    { id: 'upstream_merged', value: `${upMerged.length} of ${s.upstream.length}`, n: s.upstream.length, label: 'upstream pull requests merged by their maintainers', definition: 'Upstream pull requests whose state is merged, out of upstream pull requests opened.' },
    { id: 'models', value: models, n: rows.length, label: 'Sessions by model and effort', definition: 'Count of build-log rows per distinct model and effort pair.' },
  ];

  const rowByPr = new Map(rows.filter((r) => r.pr_number !== null).map((r) => [`${r.repo}#${r.pr_number}`, r]));
  const recent: Recent[] = [...ownPrs]
    .sort((a, b) => (a.pr.created_at < b.pr.created_at ? 1 : a.pr.created_at > b.pr.created_at ? -1 : b.pr.number - a.pr.number))
    .slice(0, 5)
    .map(({ repo, pr }) => {
      const row = rowByPr.get(`${repo}#${pr.number}`);
      return {
        repo, number: pr.number, title: pr.title, url: pr.url, state: pr.state,
        model: row?.model ?? null, effort: row?.effort ?? null, minutes: row?.minutes ?? null,
        hours_to_merge: hoursToMerge(pr), date: (pr.merged_at ?? pr.created_at).slice(0, 10),
      };
    });

  const sources = s.repos.map((r) => ({ repo: r.repo, build_log_commit: r.build_log_commit, queries: s.queries.filter((q) => q.includes(r.repo)) }));
  const prByKey = new Map(s.repos.flatMap((r) => r.prs.map((p) => [`${r.repo}#${p.number}`, p] as const)));
  const mark: MarkJson = {
    generated_at: s.generated_at, cutoff: s.cutoff, sources,
    projects: s.repos.map((r) => ({
      repo: r.repo,
      log: r.build_log === null ? 'missing' as const : rows.some((x) => x.repo === r.repo) ? 'table' as const : 'not-table' as const,
      sessions: rows.filter((x) => x.repo === r.repo).map((x) => {
        const pr = x.pr_number === null ? undefined : prByKey.get(`${r.repo}#${x.pr_number}`);
        return {
          session: x.session, model: x.model, effort: x.effort, minutes: x.minutes, not_verified: x.not_verified,
          pr_number: x.pr_number, state: pr?.state ?? 'unknown',
          merged_by_owner: pr?.state === 'merged' && pr.merged_by === s.owner,
          hours_to_merge: pr ? hoursToMerge(pr) : null,
        };
      }),
    })),
    upstream: [],
  };

  mark.upstream = [...s.upstream].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.number - b.number))
    .map((u) => ({ repo: u.repo, number: u.number, state: u.state }));

  const method: MethodJson = {
    generated_at: s.generated_at, cutoff: s.cutoff, sources,
    counts: { build_log_rows: rows.length, pull_requests: ownPrs.length },
    stats, recent,
  };
  const upstream: UpstreamJson = {
    generated_at: s.generated_at, cutoff: s.cutoff, queries: s.queries.filter((q) => q.includes('search/issues')),
    prs: upMerged.map((u) => ({ repo: u.repo, number: u.number, title: u.title, url: u.url, merged_at: u.merged_at as string }))
      .sort((a, b) => (a.merged_at < b.merged_at ? 1 : -1)),
  };
  return { method, mark, upstream };
}

/** Fixed-format text so that two runs on the same snapshot give identical bytes (REQ-029). */
export const serialise = (v: unknown): string => `${JSON.stringify(v, null, 2)}\n`;
