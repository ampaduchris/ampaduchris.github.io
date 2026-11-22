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
    expect(step?.run).toMatch(/^lychee --offline .*dist/);
  });

  test('[REQ-038] the browser and the link checker are installed before the first test step, the checker from a pinned release with its hash checked', () => {
    const first = Math.min(indexOf('Type check'), indexOf('Unit tests'), indexOf('Build'));
    expect(indexOf('Install the browser')).toBeGreaterThan(indexOf('Install from the lockfile'));
    expect(indexOf('Install the browser')).toBeLessThan(first);
    expect(indexOf('Install the link checker')).toBeLessThan(first);
    const step = wf.jobs.test.steps.find((s) => s.name === 'Install the link checker') as { run?: string; env?: Record<string, string> };
    expect(step.env?.LYCHEE_URL).toMatch(/\/releases\/download\/lychee-v\d+\.\d+\.\d+\//);
    expect(step.env?.LYCHEE_SHA256).toMatch(/^[0-9a-f]{64}$/);
    expect(step.run).toContain('sha256sum -c');
    // Nothing after the first test step installs or downloads.
    const steps = wf.jobs.test.steps;
    const firstStep = steps.findIndex((s) => s.name === names[first]);
    for (const s of steps.slice(firstStep)) expect(`${s.run ?? ''} ${s.uses ?? ''}`).not.toMatch(/playwright install|curl |wget |lychee-action/);
  });
});

describe('numbers in CI and the README', () => {
  test('[REQ-033] CI compares the committed outputs with the snapshot, and the README gives the three commands', () => {
    const step = wf.jobs.test.steps.find((s) => s.name === 'Numbers match the snapshot');
    expect(step?.run).toBe('npm run numbers -- --from-snapshot --check');
    const readme = readFileSync('README.md', 'utf8');
    const section = readme.slice(readme.indexOf('## Verify it yourself'), readme.indexOf('## Limits'));
    const blocks = [...section.matchAll(/```bash\n([^`]+)```/g)].map((m) => m[1].trim());
    expect(blocks).toContain('npm run numbers -- --live');
    expect(blocks).toContain('npm run numbers -- --from-snapshot --check');
    expect(blocks).toContain('git diff --stat -- src/data/method.json');
  });
});
