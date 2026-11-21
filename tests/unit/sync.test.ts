import { describe, expect, test } from 'vitest';
import { stringify } from 'yaml';
import { compareEntry } from '../../src/lib/sync';
import { entry } from './fixtures';

const yml = (over: Record<string, unknown> = {}) => stringify({ ...entry().portfolio, ...over });

describe('sync check (recorded responses)', () => {
  test('[REQ-018] an equal entry has no differences', () => {
    expect(compareEntry(entry(), { portfolio_yml: yml(), latest_release: 'v1.0.0' })).toEqual([]);
  });
  test('[REQ-018] a field that differs is named', () => {
    const lines = compareEntry(entry(), { portfolio_yml: yml({ tests: 12 }), latest_release: 'v1.0.0' });
    expect(lines).toEqual(['alpha: portfolio.tests differs: data file 10, repository 12']);
  });
  test('[REQ-018] a release that differs is named', () => {
    const lines = compareEntry(entry(), { portfolio_yml: yml(), latest_release: 'v1.1.0' });
    expect(lines).toEqual(['alpha: release differs: data file "v1.0.0", latest release tag "v1.1.0"']);
  });
  test('[REQ-018] a missing portfolio.yml is reported', () => {
    expect(compareEntry(entry(), { portfolio_yml: null, latest_release: 'v1.0.0' })).toEqual(['alpha: portfolio.yml is missing from example-org/alpha']);
  });
  test('[REQ-018] a schema failure is reported', () => {
    const bad = stringify({ name: 'alpha' });
    const lines = compareEntry(entry(), { portfolio_yml: bad, latest_release: 'v1.0.0' });
    expect(lines.length).toBe(8);
    expect(lines[0]).toContain('fails the schema: missing field');
  });
});
