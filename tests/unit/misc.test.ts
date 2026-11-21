import { describe, expect, test } from 'vitest';
import { execFileSync } from 'node:child_process';
import { formatDate } from '../../src/lib/dates';
import { selectUpstream, type UpstreamPr } from '../../src/lib/upstream';
import { legalProblems } from '../../src/lib/legal';
import { withAbbr } from '../../src/lib/abbr';

describe('dates', () => {
  test('[REQ-026] dates read day, three-letter month, four-digit year', () => {
    expect(formatDate('2026-11-15')).toBe('15 Nov 2026');
    expect(formatDate('2026-09-01T23:59:59Z')).toBe('1 Sep 2026');
    expect(() => formatDate('not a date')).toThrow();
  });
});

describe('upstream list', () => {
  const pr = (n: number, d: string): UpstreamPr => ({ repo: 'o/r', number: n, title: `t${n}`, url: `https://x/${n}`, merged_at: d });
  test('[REQ-004] seven pull requests give the newest five, newest first', () => {
    const seven = [1, 2, 3, 4, 5, 6, 7].map((n) => pr(n, `2026-10-0${n}T00:00:00Z`)).reverse();
    expect(selectUpstream(seven).map((p) => p.number)).toEqual([7, 6, 5, 4, 3]);
  });
  test('[REQ-004] an empty list stays empty', () => {
    expect(selectUpstream([])).toEqual([]);
  });
});

describe('legal guard', () => {
  test('[REQ-007] a missing file and a pending marker are each reported', () => {
    expect(legalProblems({ imprint: 'OWNER-DECISION-PENDING', privacy: undefined })).toEqual([
      'imprint.md still contains OWNER-DECISION-PENDING',
      'privacy.md is missing',
    ]);
    expect(legalProblems({ imprint: 'text', privacy: 'text' })).toEqual([]);
  });
});

describe('abbreviations', () => {
  test('escapes text and writes out known abbreviations', () => {
    expect(withAbbr('Redact PDFs <now>')).toBe('Redact <abbr title="Portable Document Format">PDFs</abbr> &lt;now&gt;');
  });
});

describe('colour contrast', () => {
  test('[REQ-044] every text pair meets its floor in both schemes', () => {
    const out = execFileSync('python3', ['scripts/contrast.py', 'src/styles/tokens.json'], { encoding: 'utf8' });
    expect(out).toMatch(/0 below floor/);
  });
});

describe('no em dash in the source copy', () => {
  test('[REQ-045] pages, components and data hold no U+2014', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
    const bad = ['src'].flatMap(walk).filter((f) => readFileSync(f, 'utf8').includes('—'));
    expect(bad).toEqual([]);
  });
});

describe('issue or comment', () => {
  test('[REQ-019] opens one issue when none is open and comments when one is', async () => {
    const { decideIssueAction, STALE_TITLE } = await import('../../src/lib/issue');
    expect(decideIssueAction([])).toEqual({ kind: 'create', title: 'Project data is stale' });
    expect(decideIssueAction([{ number: 3, title: 'Other' }])).toEqual({ kind: 'create', title: STALE_TITLE });
    expect(decideIssueAction([{ number: 3, title: 'Other' }, { number: 7, title: STALE_TITLE }])).toEqual({ kind: 'comment', number: 7 });
  });
});

describe('third-party origins', () => {
  const own = 'https://ampaduchris.github.io';
  const page = (head: string) => `<html><head>${head}</head><body><a href="https://example.org/x">elsewhere</a></body></html>`;
  test('[REQ-035] with analytics on, only the endpoint origin may be named, and anchors are exempt', async () => {
    const { originProblems } = await import('../../src/lib/origins');
    const endpoint = 'https://me.goatcounter.com/count';
    const on = page(`<link rel="canonical" href="${own}/"><script async data-goatcounter="${endpoint}" src="/count.js"></script>`);
    expect(originProblems({ 'index.html': on }, own, endpoint)).toEqual([]);
    const bad = page(`<script src="https://cdn.example.net/x.js"></script>`);
    expect(originProblems({ 'index.html': bad }, own, endpoint)).toEqual(['index.html: names https://cdn.example.net']);
    expect(originProblems({ 'a.css': '@import "https://fonts.example.net/f.css"; a{background:url(https://img.example.net/p.png)}' }, own, endpoint)).toHaveLength(2);
  });
  test('[REQ-035] with analytics off, the endpoint origin is not allowed either', async () => {
    const { originProblems } = await import('../../src/lib/origins');
    const on = page(`<script async data-goatcounter="https://me.goatcounter.com/count" src="/count.js"></script>`);
    expect(originProblems({ 'index.html': on }, own, null)).toEqual(['index.html: names https://me.goatcounter.com']);
  });
});
