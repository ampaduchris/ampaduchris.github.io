import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

const sync = parse(readFileSync('.github/workflows/sync.yml', 'utf8')) as any;
const ci = parse(readFileSync('.github/workflows/ci.yml', 'utf8')) as any;

describe('sync workflow', () => {
  test('[REQ-019] runs weekly and on manual dispatch, and never has contents: write', () => {
    expect(sync.on.schedule).toHaveLength(1);
    expect(sync.on).toHaveProperty('workflow_dispatch');
    expect(readFileSync('.github/workflows/sync.yml', 'utf8')).not.toMatch(/contents:\s*write/);
    expect(sync.jobs['project-data'].permissions).toEqual({ contents: 'read', issues: 'write' });
  });
  test('[REQ-047] external links are checked weekly and an issue is opened on failure', () => {
    const steps = sync.jobs['external-links'].steps.map((s: any) => s.name);
    expect(steps).toContain('Check external links');
    expect(steps).toContain('Open an issue when a link is broken');
  });
});

describe('deploy', () => {
  const deploy = ci.jobs.deploy;
  test('[REQ-052] the deploy job runs only on main, after the checks, with page permissions on that job alone', () => {
    expect(deploy.needs).toEqual(expect.arrayContaining(['test', 'gitleaks', 'build-pages']));
    expect(deploy.if).toContain("refs/heads/main");
    expect(deploy.if).toContain("push");
    expect(deploy.permissions).toEqual({ pages: 'write', 'id-token': 'write' });
    expect(ci.permissions).toEqual({ contents: 'read' });
    expect(JSON.stringify(deploy)).toContain('actions/deploy-pages@');
  });
  test('[REQ-052] the deploy step runs only when the legal check passed, and a failed check says so', () => {
    const steps = deploy.steps;
    const legal = steps.find((s: any) => s.id === 'legal');
    expect(legal.run).toContain('scripts/legal-check.ts');
    expect(legal['continue-on-error']).toBe(true);
    expect(steps.find((s: any) => s.id === 'deployment').if).toContain("steps.legal.outcome == 'success'");
    expect(steps.find((s: any) => s.name === 'Say why nothing was published').if).toContain("steps.legal.outcome == 'failure'");
  });
});

describe('cross-browser job', () => {
  test('runs the browser tests in Firefox and WebKit with no secret and is not a dependency of the deploy', () => {
    const job = ci.jobs['cross-browser'];
    const run = job.steps.map((s: any) => s.run ?? '').join('\n');
    expect(run).toContain('--project=firefox --project=webkit');
    expect(JSON.stringify(job)).not.toContain('secrets.');
    expect(ci.jobs.deploy.needs).not.toContain('cross-browser');
  });
});
