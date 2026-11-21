// Compares each project entry with its repository (REQ-018). Network access happens here and nowhere else.
// Usage: npm run sync-check     (set GITHUB_TOKEN to raise the rate limit; the token is never printed)
import { loadProjects } from '../src/lib/data';
import { compareEntry, type Remote } from '../src/lib/sync';

async function get(url: string): Promise<Response> {
  const headers: Record<string, string> = { 'user-agent': 'site-sync-check' };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return fetch(url, { headers });
}

async function remoteFor(repo: string): Promise<Remote> {
  const file = await get(`https://raw.githubusercontent.com/${repo}/HEAD/portfolio.yml`);
  const rel = await get(`https://api.github.com/repos/${repo}/releases/latest`);
  return {
    portfolio_yml: file.status === 404 ? null : await file.text(),
    latest_release: rel.ok ? ((await rel.json()) as { tag_name: string }).tag_name : null,
  };
}

const lines: string[] = [];
for (const entry of loadProjects()) lines.push(...compareEntry(entry, await remoteFor(entry.repo)));
for (const l of lines) console.log(l);
console.log(lines.length ? `${lines.length} difference(s)` : 'all entries current');
process.exit(lines.length ? 1 : 0);
