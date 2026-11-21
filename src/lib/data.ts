import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { validateProjects, sortedProjects, type Project } from './schema';
import { selectUpstream, type UpstreamPr } from './upstream';

// Paths start at the repository root: the build bundles these modules, so import.meta.url does not point at src/.
const root = process.cwd();
const read = (name: string) => readFileSync(resolve(root, 'src/data', name), 'utf8');

export interface Site {
  name: string; url: string; repo_url: string; build_log_url: string; github_url: string;
  contact: { label: string; href: string; kind: string }[];
}

export function loadSite(): Site {
  return parse(read('site.yml')) as Site;
}

/** Throws, naming the entry and the field, so the build fails (REQ-014 to REQ-017). */
export function loadProjects(): Project[] {
  const data = parse(read('projects.yml'));
  const errors = validateProjects(data);
  if (errors.length) throw new Error(`projects.yml is invalid:\n  ${errors.join('\n  ')}`);
  return sortedProjects(data as Project[]);
}

/** UPSTREAM_FIXTURE names a file under tests/fixtures/ and is used only by the fixture build in the tests. */
export function loadUpstream(): UpstreamPr[] {
  const fixture = process.env.UPSTREAM_FIXTURE;
  const text = fixture
    ? readFileSync(resolve(root, 'tests/fixtures', fixture), 'utf8')
    : read('upstream.json');
  return selectUpstream((JSON.parse(text) as { prs: UpstreamPr[] }).prs);
}
