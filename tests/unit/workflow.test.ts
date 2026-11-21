import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const wf = parse(readFileSync('.github/workflows/ci.yml', 'utf8')) as {
  permissions: Record<string, string>;
  jobs: Record<string, { steps: { name?: string; run?: string; uses?: string; with?: Record<string, string> }[] }>;
};
const names = wf.jobs.test.steps.map((s) => s.name).filter(Boolean) as string[];
const indexOf = (n: string) => names.indexOf(n);

describe('pull request workflow', () => {
  test('[REQ-051] the checks run in the specified order', () => {
    const order = ['Install from the lockfile', 'Type check', 'Unit tests', 'Build', 'Contrast', 'Requirement traceability', 'Browser tests with axe', 'Link check (offline)'];
    const at = order.map(indexOf);
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
  });

  test('[REQ-051] the checks are the commands the spec names', () => {
    const run = (n: string) => wf.jobs.test.steps.find((s) => s.name === n)?.run ?? '';
    expect(run('Install from the lockfile')).toBe('npm ci');
    expect(run('Browser tests with axe')).toBe('npm run e2e');
  });

  test('[REQ-038] the test job names no secret and the workflow is read-only', () => {
    expect(JSON.stringify(wf.jobs.test)).not.toContain('secrets.');
    expect(wf.permissions).toEqual({ contents: 'read' });
  });

  test('[REQ-046] the link check runs offline over the built pages', () => {
    const step = wf.jobs.test.steps.find((s) => s.name === 'Link check (offline)');
    expect(step?.uses).toMatch(/^lycheeverse\/lychee-action@[0-9a-f]{40}$/);
    expect(step?.with?.args).toContain('--offline');
    expect(step?.with?.args).toContain('dist');
  });
});
