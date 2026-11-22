import { describe, expect, test } from 'vitest';
import { computeNumbers, median, parseBuildLog, serialise, type PrRecord, type Snapshot } from '../../src/lib/numbers';

const OWNER = 'me';
const LOG = `# Build log

| Date | Session | Model | Effort (source) | Minutes | Tiers passed | NOT VERIFIED | PR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-11-19 | 1.1 | Sonnet 5.5 | medium (app session record) | 4 | V1-V6 PASS | 2 | https://github.com/o/r/pull/1 |
| 2026-11-19 | 1.2 | Sonnet 5.5 (adopted draft: Fable 5.2 / high, 14 Nov 2026) | high (app session record) | ~8 (estimated from clock) | V1-V6 PASS | 5 | https://github.com/o/r/pull/2 |
| 2026-11-21 | 1.3 | Sonnet 5.5 | low (app session record) at start; raised to high | 24 (from the timer hook) | V1-V6 PASS | 9 | https://github.com/o/r/pull/3 |
`;

const pr = (n: number, over: Partial<PrRecord> = {}): PrRecord => ({
  number: n, title: `PR ${n}`, url: `https://github.com/o/r/pull/${n}`, state: 'merged', author: OWNER,
  created_at: `2026-11-20T0${n % 10}:00:00Z`, merged_at: `2026-11-20T0${n % 10}:30:00Z`, merged_by: OWNER, ready_at: `2026-11-20T0${n % 10}:10:00Z`,
  owner_comment_times: [], ...over,
});

function snap(prs: PrRecord[], extra: Partial<Snapshot> = {}): Snapshot {
  return {
    generated_at: '2026-11-21T12:00:00Z', cutoff: '2026-11-15', owner: OWNER, queries: ['gh api repos/o/r/pulls'],
    repos: [{
      repo: 'o/r', build_log: LOG, build_log_commit: 'abc',
      commits: [
        { sha: 'a', date: '2026-11-16T10:00:00Z', parents: 1, coauthor_lines: ['Co-Authored-By: Claude Sonnet 5.5 <x@y>'] },
        { sha: 'b', date: '2026-11-17T10:00:00Z', parents: 1, coauthor_lines: [] },
        { sha: 'c', date: '2026-11-18T10:00:00Z', parents: 2, coauthor_lines: [] }, // merge commit: excluded
        { sha: 'd', date: '2026-11-10T10:00:00Z', parents: 1, coauthor_lines: [] }, // before the cut-off: excluded
      ],
      prs,
    }],
    upstream: [],
    ...extra,
  };
}
const stat = (s: Snapshot, id: string) => computeNumbers(s).method.stats.find((x) => x.id === id)!;
const many = (k: number) => Array.from({ length: k }, (_, i) => pr(i + 1));

describe('build log parsing', () => {
  test('[REQ-027] rows give model, effort, minutes, not-verified count and pull request, whatever the notes say', () => {
    const rows = parseBuildLog('o/r', LOG);
    expect(rows.map((r) => [r.session, r.pair, r.minutes, r.not_verified, r.pr_number])).toEqual([
      ['1.1', 'Sonnet 5.5 / medium', 4, 2, 1],
      ['1.2', 'Sonnet 5.5 / high', 8, 5, 2],
      ['1.3', 'Sonnet 5.5 / low', 24, 9, 3],
    ]);
    expect(parseBuildLog('o/r', null)).toEqual([]);
    expect(parseBuildLog('o/r', '# Old log\n\nno table here\n')).toEqual([]);
  });
});

describe('the statistics', () => {
  test('[REQ-028] method.json holds exactly the eight statistics, each with its five fields', () => {
    const { method } = computeNumbers(snap(many(3)));
    expect(method.stats.map((s) => s.id)).toEqual(['sessions', 'agent_commits', 'prs_merged', 'prs_commented', 'hours_to_merge', 'not_verified', 'upstream_merged', 'models']);
    for (const s of method.stats) expect(Object.keys(s).sort()).toEqual(['definition', 'id', 'label', 'n', 'value']);
    expect(method.recent.length).toBe(3);
    expect(Object.keys(method.recent[0]).sort()).toEqual(['date', 'effort', 'hours_to_merge', 'minutes', 'model', 'number', 'repo', 'state', 'title', 'url']);
  });

  test('[REQ-028] values and sample sizes are the counts the definitions give', () => {
    const prs = [pr(1, { owner_comment_times: ['2026-11-20T01:15:00Z'] }), pr(2), pr(3, { state: 'open', merged_at: null, merged_by: null }), pr(4, { merged_by: 'someone' }), pr(5, { author: 'dependabot[bot]' }), pr(6, { created_at: '2026-11-10T00:00:00Z' })];
    const s = snap(prs);
    expect(stat(s, 'sessions')).toMatchObject({ value: 3, n: 3 });
    expect(stat(s, 'agent_commits')).toMatchObject({ value: '1 of 2', n: 2 });
    expect(stat(s, 'prs_merged')).toMatchObject({ value: '2 of 3', n: 3 }); // 1, 2 by me; 4 merged by someone else; 3 open is not counted; bots and old ones are not own
    expect(stat(s, 'prs_commented')).toMatchObject({ value: '1 of 3', n: 3 });
    expect(stat(s, 'not_verified')).toMatchObject({ value: 16, n: 3 });
    expect(stat(s, 'upstream_merged')).toMatchObject({ value: '0 of 0', n: 0 });
    expect(stat(s, 'models').value).toEqual([
      { name: 'Sonnet 5.5 / high', sessions: 1 }, { name: 'Sonnet 5.5 / low', sessions: 1 }, { name: 'Sonnet 5.5 / medium', sessions: 1 },
    ]);
  });

  test('[REQ-028] a comment after the merge does not count as a check', () => {
    const s = snap([pr(1, { owner_comment_times: ['2026-11-20T09:00:00Z'] })]);
    expect(stat(s, 'prs_commented').value).toBe('0 of 1');
  });

  test('[REQ-025] the median is null at 19 merged pull requests and a number at 20', () => {
    expect(stat(snap(many(19)), 'hours_to_merge')).toMatchObject({ value: null, n: 19 });
    expect(stat(snap(many(20)), 'hours_to_merge')).toMatchObject({ value: 0.3, n: 20 });
  });

  test('[REQ-025] the median is of merge time minus ready time, or opened time when never a draft', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
    const prs = Array.from({ length: 20 }, (_, i) => pr(i + 1, { created_at: '2026-11-20T00:00:00Z', ready_at: null, merged_at: '2026-11-20T02:00:00Z' }));
    expect(stat(snap(prs), 'hours_to_merge').value).toBe(2);
  });

  test('[REQ-027] upstream pull requests are counted from their own records', () => {
    const s = snap([], { upstream: [
      { repo: 'x/y', number: 1, title: 'a', url: 'https://github.com/x/y/pull/1', state: 'merged', created_at: '2026-11-16T00:00:00Z', merged_at: '2026-11-18T00:00:00Z' },
      { repo: 'x/z', number: 2, title: 'b', url: 'https://github.com/x/z/pull/2', state: 'open', created_at: '2026-11-17T00:00:00Z', merged_at: null },
    ] });
    expect(stat(s, 'upstream_merged')).toMatchObject({ value: '1 of 2', n: 2 });
    expect(computeNumbers(s).upstream.prs).toEqual([{ repo: 'x/y', number: 1, title: 'a', url: 'https://github.com/x/y/pull/1', merged_at: '2026-11-18T00:00:00Z' }]);
  });
});

describe('the outputs', () => {
  test('[REQ-029] the order of the log rows does not change the order of equal model counts', () => {
    const lines = LOG.split('\n');
    const head = lines.filter((l) => !/^\| 2026-/.test(l));
    const rows = lines.filter((l) => /^\| 2026-/.test(l));
    const reversed = [...head.slice(0, -1), ...[...rows].reverse(), ''].join('\n');
    const a = snap(many(3));
    const b = snap(many(3));
    b.repos[0].build_log = reversed;
    expect(stat(b, 'models').value).toEqual(stat(a, 'models').value);
  });

  test('[REQ-027] each output records its time stamp, the cut-off and the sources, and the text is exact', () => {
    const { method, mark, upstream } = computeNumbers(snap(many(2)));
    expect(method.generated_at).toBe('2026-11-21T12:00:00Z');
    expect(method.cutoff).toBe('2026-11-15');
    expect(method.sources).toEqual([{ repo: 'o/r', build_log_commit: 'abc', queries: ['gh api repos/o/r/pulls'] }]);
    expect(mark.generated_at).toBe('2026-11-21T12:00:00Z');
    expect(mark.cutoff).toBe('2026-11-15');
    expect(mark.sources).toEqual(method.sources);
    expect(upstream.cutoff).toBe('2026-11-15');
    expect(upstream.queries).toEqual([]);
    expect(upstream.generated_at).toBe('2026-11-21T12:00:00Z');
    expect(serialise(upstream)).toBe('{\n  "generated_at": "2026-11-21T12:00:00Z",\n  "cutoff": "2026-11-15",\n  "queries": [],\n  "prs": []\n}\n');
  });

  test('[REQ-027] upstream.json records the search query it came from', () => {
    const q = 'gh api search/issues?q=type:pr+author:me+-user:me&per_page=100';
    const { upstream } = computeNumbers(snap([], { queries: ['gh api repos/o/r/pulls', q] }));
    expect(upstream.queries).toEqual([q]);
  });

  test('[REQ-028] recent holds the five newest own pull requests, newest first', () => {
    const day = (n: number) => `2026-11-${String(16 + n).padStart(2, '0')}T00:00:00Z`;
    const prs = [3, 7, 1, 5, 2, 6, 4].map((n) => pr(n, { created_at: day(n), merged_at: day(n), ready_at: day(n) }));
    const { recent } = computeNumbers(snap(prs)).method;
    expect(recent.map((r) => r.number)).toEqual([7, 6, 5, 4, 3]);
  });

  test('[REQ-028] [REQ-054] a pull request merged by another account is not marked as merged by the owner', () => {
    const { mark } = computeNumbers(snap([pr(1), pr(2, { merged_by: 'someone' })]));
    expect(mark.projects[0].sessions.slice(0, 2).map((x) => [x.state, x.merged_by_owner])).toEqual([['merged', true], ['merged', false]]);
  });

  test('[REQ-028] mark.json has one record per build-log row with the pull request state', () => {
    const { mark } = computeNumbers(snap([pr(1), pr(2, { state: 'open', merged_at: null, merged_by: null })]));
    const s = mark.projects[0].sessions;
    expect(s.map((x) => [x.session, x.state, x.merged_by_owner])).toEqual([['1.1', 'merged', true], ['1.2', 'open', false], ['1.3', 'unknown', false]]);
    expect(Object.keys(s[0]).sort()).toEqual(['effort', 'hours_to_merge', 'merged_by_owner', 'minutes', 'model', 'not_verified', 'pr_number', 'session', 'state']);
  });

  test('[REQ-028] [REQ-054] mark.json says whether each build log has a row table', () => {
    const s = snap(many(1));
    s.repos.push({ repo: 'o/prose', build_log: '# Build log\n\nSession one went well.\n', build_log_commit: 'def', commits: [], prs: [] });
    s.repos.push({ repo: 'o/none', build_log: null, build_log_commit: null, commits: [], prs: [] });
    expect(computeNumbers(s).mark.projects.map((p) => [p.repo, p.log])).toEqual([['o/r', 'table'], ['o/prose', 'not-table'], ['o/none', 'missing']]);
  });

  test('[REQ-029] two runs on the same input give identical bytes', () => {
    const a = serialise(computeNumbers(snap(many(5))).method);
    const b = serialise(computeNumbers(snap(many(5))).method);
    expect(a).toBe(b);
    expect(serialise(computeNumbers(snap(many(5), { generated_at: '2027-01-01T00:00:00Z' })).method).replace(/"generated_at": "[^"]*"/, '')).toBe(a.replace(/"generated_at": "[^"]*"/, ''));
  });

  test('[REQ-029] the order of the input records does not change the output', () => {
    const fwd = computeNumbers(snap(many(6))).method;
    const rev = computeNumbers(snap([...many(6)].reverse())).method;
    expect(serialise(rev)).toBe(serialise(fwd));
  });
});
