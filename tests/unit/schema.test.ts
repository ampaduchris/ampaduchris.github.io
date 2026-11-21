import { describe, expect, test } from 'vitest';
import { validateProjects } from '../../src/lib/schema';
import { loadProjects } from '../../src/lib/data';
import { entry } from './fixtures';

const errs = (data: unknown) => validateProjects(data);

describe('project data file', () => {
  test('[REQ-014] the real data file is valid and loads in order', () => {
    const p = loadProjects();
    expect(p.map((x) => x.order)).toEqual([...p.map((x) => x.order)].sort((a, b) => a - b));
    expect(p.length).toBeGreaterThan(0);
  });

  test('[REQ-014] a missing field is named with its entry', () => {
    const e = entry() as unknown as Record<string, unknown>;
    delete e.sessions;
    expect(errs([e])).toEqual(['alpha: missing field "sessions"']);
  });

  test('[REQ-014] a missing nested field is named', () => {
    const e = entry();
    delete (e.portfolio as unknown as Record<string, unknown>).demo_url;
    expect(errs([e])).toContain('alpha: portfolio: missing field "demo_url"');
  });

  test('[REQ-014] a field of the wrong type is named', () => {
    const e = entry();
    (e.portfolio as unknown as Record<string, unknown>).tests = '10';
    expect(errs([e])).toContain('alpha: portfolio.tests must be an integer');
  });

  test('[REQ-014] an unknown field is named', () => {
    const e = { ...entry(), colour: 'blue' };
    expect(errs([e])).toEqual(['alpha: unknown field "colour"']);
  });

  test('[REQ-014] a label over 40 characters fails', () => {
    const e = entry();
    e.headline.label = 'x'.repeat(41);
    expect(errs([e])[0]).toContain('headline.label');
  });

  test('[REQ-015] two entries with one slug fail', () => {
    const a = entry();
    const b = entry({ order: 2 });
    expect(errs([a, b])).toContain('alpha: slug is used by another entry');
  });

  test('[REQ-015] two entries with one order fail', () => {
    const a = entry();
    const b = entry({ slug: 'beta' });
    expect(errs([a, b])).toContain('beta: order 1 is used by another entry');
  });

  test('[REQ-016] a tests headline must equal portfolio.tests', () => {
    const e = entry();
    e.headline.value = '11';
    expect(errs([e])).toEqual(['alpha: headline.value "11" must equal portfolio.tests 10 when kind is tests']);
    expect(errs([entry()])).toEqual([]);
  });

  test('[REQ-017] a measured headline must link under the repository', () => {
    const e = entry();
    e.headline.kind = 'measured';
    e.headline.value = '0 of 38';
    e.headline.source_url = 'https://example.org/elsewhere';
    expect(errs([e])).toEqual(['alpha: headline.source_url must start with portfolio.repo_url when kind is measured']);
    e.headline.source_url = 'https://github.com/example-org/alpha/blob/v1.0.0/README.md#verify';
    expect(errs([e])).toEqual([]);
  });
});
