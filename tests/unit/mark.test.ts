import { describe, expect, test } from 'vitest';
import fc from 'fast-check';
import { GEOMETRY, layout, markLabel, renderMark, ringRadii, summary, tableHTML, type MarkData, type MarkSession } from '../../src/lib/mark';

const sess = (id: string, over: Partial<MarkSession> = {}): MarkSession => ({
  id, model: 'Model A', effort: 'high', minutes: 30, state: 'merged', pr: 1, url: 'https://example.org/pr/1', hours: 1, nv: 0, ...over,
});
const FIXTURE: MarkData = {
  projects: [
    { slug: 'one', name: 'one', sessions: [sess('1.1', { effort: 'low', nv: 2 }), sess('1.2', { state: 'open', effort: 'medium', nv: 1 }), sess('1.3', { effort: 'xhigh' })] },
    { slug: 'two', name: 'two', sessions: [sess('2.1', { model: 'Model B', effort: 'max', nv: 3 })] },
  ],
  upstream: [{ state: 'merged' }, { state: 'open' }, { state: 'merged' }],
};
const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;

describe('encoding', () => {
  const svg = renderMark(FIXTURE);
  const L = layout(FIXTURE);

  test('[REQ-054] one ring per project and one arc per session, in log order, oldest ring innermost', () => {
    expect(L.rings.map((r) => r.slug)).toEqual(['one', 'two']);
    expect(L.rings[0].r).toBeLessThan(L.rings[1].r);
    expect(count(svg, /class="seg /g)).toBe(4);
    expect(L.rings[0].segs.map((s) => s.id)).toEqual(['1.1', '1.2', '1.3']);
    for (let i = 1; i < 3; i++) expect(L.rings[0].segs[i].a0).toBeGreaterThan(L.rings[0].segs[i - 1].a1);
  });

  test('[REQ-054] arc angle is proportional to minutes', () => {
    const d: MarkData = { projects: [{ slug: 'p', name: 'p', sessions: [sess('a', { minutes: 10 }), sess('b', { minutes: 20 })] }], upstream: [] };
    const [a, b] = layout(d).rings[0].segs;
    expect((b.a1 - b.a0) / (a.a1 - a.a0)).toBeCloseTo(2, 1);
    expect(a.a1 - a.a0).toBeCloseTo(10 * GEOMETRY.degPerMinute, 1);
  });

  test('[REQ-054] stroke width is set by effort', () => {
    const widths = Object.fromEntries(L.rings.flatMap((r) => r.segs).map((s) => [s.effort, s.width]));
    expect(widths).toMatchObject({ low: 4, medium: 7, xhigh: 13, max: 13 });
    expect(layout({ projects: [{ slug: 'p', name: 'p', sessions: [sess('a', { effort: 'high' })] }], upstream: [] }).rings[0].segs[0].width).toBe(10);
  });

  test('[REQ-054] an arc is solid if and only if the owner merged it; others are dashed', () => {
    expect(count(svg, /class="seg [^"]*\bmerged\b/g)).toBe(3);
    expect(count(svg, /class="seg [^"]*\bopen\b/g)).toBe(1);
    // the dash comes from the style sheet rule on .open, so the open class must sit on the segment group
    expect(svg).toMatch(/<g class="seg m0 open has-nv"/);
  });

  test('[REQ-054] one dot per check reported as not verified', () => {
    expect(count(svg, /class="nv"/g)).toBe(2 + 1 + 3);
  });

  test('[REQ-054] one outer node per upstream pull request, filled if and only if merged', () => {
    expect(count(svg, /class="up merged"/g)).toBe(2);
    expect(count(svg, /class="up open"/g)).toBe(1);
  });

  test('[REQ-054] the single-ring form shows one project and carries no node or label', () => {
    const mini = renderMark(FIXTURE, { only: 'one', id: 'r1' });
    expect(count(mini, /class="seg /g)).toBe(3);
    expect(mini).not.toContain('class="up ');
    expect(mini).not.toContain('class="rlab"');
    expect(mini).toContain('aria-hidden="true"');
  });

  test('[REQ-057] the accessible name states the counts of sessions, merged pull requests and checks not verified', () => {
    const name = markLabel(FIXTURE);
    expect(name).toContain('4 agent sessions');
    expect(name).toContain('3 merged by the owner');
    expect(name).toContain('6 checks reported as not verified');
    expect(svg).toContain(`aria-label="${name}"`);
    expect(svg).toContain('tabindex="0"');
    expect(summary(FIXTURE)).toMatchObject({ sessions: 4, merged: 3, nv: 6, upstreamMerged: 2, upstream: 3 });
  });

  test('values from data are escaped in the HTML', () => {
    const d: MarkData = { projects: [{ slug: 'p', name: '<b>"x"</b>', sessions: [sess('<i>1</i>')] }], upstream: [] };
    const out = renderMark(d) + tableHTML(d);
    expect(out).not.toContain('<b>"x"</b>');
    expect(out).not.toContain('<i>1</i>');
    expect(out).toContain('&lt;i&gt;1&lt;/i&gt;');
  });
});

describe('the table', () => {
  test('[REQ-056] the table has one row per arc, with the session, minutes and pull request state', () => {
    const t = tableHTML(FIXTURE);
    expect(count(t, /<tr><td>/g)).toBe(4);
    expect(t).toContain('<td>1.2</td><td>Model A / medium</td><td>30</td><td>#1, not merged by me</td>');
    expect(t).toContain('<td>1.1</td><td>Model A / low</td><td>30</td><td>#1, merged by me</td>');
  });
});

describe('geometry', () => {
  const sessionArb = fc.record({
    id: fc.string({ minLength: 1, maxLength: 5 }), model: fc.constantFrom('A', 'B', 'C', 'D'), effort: fc.constantFrom('low', 'medium', 'high', 'xhigh', 'max'),
    minutes: fc.integer({ min: 1, max: 600 }), state: fc.constantFrom<'merged' | 'open'>('merged', 'open'),
    pr: fc.option(fc.integer({ min: 1, max: 99 }), { nil: null }), url: fc.constant(null), hours: fc.constant(null), nv: fc.integer({ min: 0, max: 9 }),
  });
  const dataArb = fc.array(fc.array(sessionArb, { minLength: 0, maxLength: 60 }), { minLength: 1, maxLength: 6 }).map((rings): MarkData => ({
    projects: rings.map((sessions, i) => ({ slug: `p${i}`, name: `p${i}`, sessions })), upstream: [],
  }));

  test('[REQ-055] for any valid data no two arcs on a ring overlap, a ring spans at most 360 degrees and every radius is within the limits', () => {
    fc.assert(fc.property(dataArb, (data) => {
      const { rings } = layout(data);
      for (const ring of rings) {
        expect(ring.r).toBeGreaterThanOrEqual(GEOMETRY.ringMin);
        expect(ring.r).toBeLessThanOrEqual(GEOMETRY.ringMax);
        const segs = ring.segs;
        for (let i = 1; i < segs.length; i++) expect(segs[i].a0).toBeGreaterThanOrEqual(segs[i - 1].a1 - 0.011);
        for (const s of segs) expect(s.a1).toBeGreaterThanOrEqual(s.a0);
        if (segs.length) {
          const span = segs[segs.length - 1].a1 + GEOMETRY.gapDeg - segs[0].a0;
          expect(span).toBeLessThanOrEqual(360 + 0.05);
        }
      }
      expect(rings.reduce((a, r) => a + r.segs.length, 0)).toBe(data.projects.reduce((a, p) => a + p.sessions.length, 0));
    }), { numRuns: 300 });
  });

  test('[REQ-055] ring radii are spread evenly and a single ring sits at the outer limit', () => {
    expect(ringRadii(1)).toEqual([GEOMETRY.ringMax]);
    expect(ringRadii(3)).toEqual([92, 157, 222]);
  });
});
