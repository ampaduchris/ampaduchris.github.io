import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProjects, loadSite } from './data';
import type { MarkJson } from './numbers';
import type { MarkData } from './mark';

/** mark.json joined with the project data file. Rings run oldest first (by release date); the site's own sessions are the outermost ring. */
export function loadMarkData(): MarkData {
  // MARK_FIXTURE names a file under tests/fixtures/ and is used only by the fixture build in the tests.
  const fixture = process.env.MARK_FIXTURE;
  const mark = JSON.parse(readFileSync(resolve(process.cwd(), fixture ? `tests/fixtures/${fixture}` : 'src/data/mark.json'), 'utf8')) as MarkJson;
  const projects = loadProjects();
  const site = loadSite();
  const siteRepo = new URL(site.repo_url).pathname.slice(1);
  const byRepo = new Map(mark.projects.map((p) => [p.repo, p]));
  const toSessions = (repo: string) => (byRepo.get(repo)?.sessions ?? []).map((s) => ({
    id: s.session, model: s.model, effort: s.effort, minutes: s.minutes ?? 1,
    state: (s.merged_by_owner ? 'merged' : 'open') as 'merged' | 'open',
    pr: s.pr_number, url: s.pr_number === null ? null : `https://github.com/${repo}/pull/${s.pr_number}`,
    hours: s.hours_to_merge, nv: s.not_verified,
  }));
  const rings = [...projects]
    .sort((a, b) => (a.portfolio.released_on < b.portfolio.released_on ? -1 : 1))
    .map((p) => ({ slug: p.slug, name: p.portfolio.name, sessions: toSessions(p.repo) }));
  rings.push({ slug: 'site', name: 'this site', sessions: toSessions(siteRepo) });
  return { projects: rings, upstream: mark.upstream.map((u) => ({ state: u.state })) };
}
