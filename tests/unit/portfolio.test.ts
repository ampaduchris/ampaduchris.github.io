import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { compareEntry } from '../../src/lib/sync';
import { parse } from 'yaml';
import { entry } from './fixtures';

const text = readFileSync('portfolio.yml', 'utf8');
const own = parse(text) as Record<string, unknown>;

describe('own portfolio.yml', () => {
  test('[REQ-018] passes the same sync check the site runs on the other repositories', () => {
    const e = { ...entry(), slug: 'self', repo: 'ampaduchris/ampaduchris.github.io', portfolio: own } as ReturnType<typeof entry>;
    e.headline = { ...e.headline, value: String(own.tests), kind: 'tests' } as typeof e.headline;
    expect(compareEntry(e, { portfolio_yml: text, latest_release: String(own.release) })).toEqual([]);
  });
  test('[REQ-018] a stale release is reported against it', () => {
    const e = { ...entry(), slug: 'self', portfolio: own } as ReturnType<typeof entry>;
    expect(compareEntry(e, { portfolio_yml: text, latest_release: 'v1.0.1' }).join()).toContain('release differs');
  });
});

describe('release workflow', () => {
  const wf = parse(readFileSync('.github/workflows/release.yml', 'utf8')) as { on: { push: { tags: string[] } }; permissions: Record<string, string>; jobs: { release: { permissions: Record<string, string> } } };
  test('[REQ-052] runs on version tags, read-only except the release job', () => {
    expect(wf.on.push.tags).toEqual(['v*']);
    expect(wf.permissions).toEqual({ contents: 'read' });
    expect(wf.jobs.release.permissions).toEqual({ contents: 'write' });
  });
  test('[REQ-018] the changelog has a section for the release named in portfolio.yml', () => {
    const v = String(own.release).replace(/^v/, '');
    expect(readFileSync('CHANGELOG.md', 'utf8')).toContain(`## ${v} `);
  });
});
