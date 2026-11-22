// The proof mark (DESIGN.md section 6.1). Pure functions: data in, geometry and strings out. They run at build time,
// so the drawing is in the HTML with scripts off (REQ-053). The browser code is public/mark.js and adds nothing the HTML lacks.
//
//   one ring per project, oldest innermost; one arc per build-log row, clockwise in log order
//   arc length = minutes taken; stroke width = effort; solid = merged by the owner; dashed = otherwise
//   one dot outside an arc per check reported as not verified
//   outer orbit: one node per upstream pull request, filled when merged
//   centre: the owner

export const GEOMETRY = {
  box: 600, centre: 300,
  eye: 6, halo: 24,
  ringMin: 92, ringMax: 222, // project rings are spread evenly between these; a single ring sits at ringMax
  orbitR: 266,
  degPerMinute: 0.62, gapDeg: 3.4,
  ringOffsetDeg: 47, // each ring starts this much further round than the one inside it
  effortWidth: { low: 4, medium: 7, high: 10, xhigh: 13, max: 13 } as Record<string, number>,
  nvStep: 8.5, nvR: 3.2,
  labelInset: 16, labelStartDeg: 278, labelSpanDeg: 210, labelSize: 11,
  miniScale: 2.2,
  upstreamStartDeg: 24, upstreamStepDeg: 15, upstreamNodeR: 5.5,
};
const G = GEOMETRY;

export interface MarkSession {
  id: string; model: string; effort: string; minutes: number; state: 'merged' | 'open'; pr: number | null; url: string | null; hours: number | null; nv: number;
}
export interface MarkProject { slug: string; name: string; log?: 'table' | 'not-table' | 'missing'; sessions: MarkSession[] }
export interface MarkData { projects: MarkProject[]; upstream: { state: 'merged' | 'open' | 'closed' }[] }

export interface Seg extends MarkSession {
  project: string; projectName: string; i: number; r: number; a0: number; a1: number; mid: number; width: number; cls: string;
}
export interface Ring { slug: string; name: string; log: 'table' | 'not-table' | 'missing'; r: number; segs: Seg[] }

const f = (n: number): number => Number(n.toFixed(2));
export const esc = (s: unknown): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const polar = (r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [f(G.centre + r * Math.cos(a)), f(G.centre + r * Math.sin(a))];
};
const arcPath = (r: number, a0: number, a1: number): string => {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};
export const ringRadii = (n: number): number[] =>
  n <= 1 ? [G.ringMax] : Array.from({ length: n }, (_, i) => f(G.ringMin + (i * (G.ringMax - G.ringMin)) / (n - 1)));
const modelClass = (m: string, models: string[]): string => ['m0', 'm1', 'm2'][Math.min(2, models.indexOf(m))];

/** Pure geometry. Arcs on a ring never overlap, a ring's arcs and gaps span at most 360 degrees (REQ-055). */
export function layout(data: MarkData, { only = null }: { only?: string | null } = {}) {
  const projects = only ? data.projects.filter((p) => p.slug === only) : data.projects;
  const counts: Record<string, number> = {};
  data.projects.forEach((p) => p.sessions.forEach((s) => { counts[s.model] = (counts[s.model] ?? 0) + 1; }));
  const models = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  let index = 0;
  const radii = ringRadii(projects.length);
  const rings: Ring[] = projects.map((p, i) => {
    const r = radii[i];
    const raw = p.sessions.map((s) => s.minutes * G.degPerMinute);
    const gaps = G.gapDeg * p.sessions.length;
    const total = raw.reduce((a, b) => a + b, 0) + gaps;
    const k = total > 360 ? (360 - gaps) / (total - gaps) : 1;
    let a = only ? 0 : i * G.ringOffsetDeg;
    const segs = p.sessions.map((s, j) => {
      const a0 = a;
      const a1 = a + raw[j] * k;
      a = a1 + G.gapDeg;
      return {
        ...s, project: p.slug, projectName: p.name, i: index++, r, a0: f(a0), a1: f(a1), mid: f((a0 + a1) / 2),
        width: (G.effortWidth[s.effort] ?? G.effortWidth.medium) * (only ? G.miniScale : 1), cls: modelClass(s.model, models),
      };
    });
    return { slug: p.slug, name: p.name, log: p.log ?? 'table', r, segs };
  });
  const upstream = only ? [] : data.upstream.map((u, j) => ({ ...u, angle: G.upstreamStartDeg + j * G.upstreamStepDeg }));
  return { rings, upstream, models };
}

export function summary(data: MarkData) {
  const all = data.projects.flatMap((p) => p.sessions);
  const merged = all.filter((s) => s.state === 'merged').length;
  return {
    sessions: all.length, merged, open: all.length - merged,
    nv: all.reduce((a, s) => a + s.nv, 0),
    upstreamMerged: data.upstream.filter((u) => u.state === 'merged').length, upstream: data.upstream.length,
  };
}

/** The accessible name: the counts of sessions, merged pull requests and checks not verified (REQ-057). */
export function markLabel(data: MarkData): string {
  const S = summary(data);
  return `Proof mark. ${S.sessions} agent sessions in ${data.projects.length} rings, ${S.merged} merged by the owner, ${S.nv} checks reported as not verified, ${S.upstreamMerged} of ${S.upstream} upstream pull requests merged. The same data is in the table below.`;
}

export function renderMark(data: MarkData, { only = null, id = 'mark', still = false }: { only?: string | null; id?: string; still?: boolean } = {}): string {
  const L = layout(data, { only });
  const S = summary(data);
  const c = G.centre;
  const dial = [...L.rings.map((r) => r.r), G.orbitR].map((r) => `<circle class="dial" cx="${c}" cy="${c}" r="${r}"/>`).join('');
  const ticks = Array.from({ length: 72 }, (_, t) => {
    const [x0, y0] = polar(G.orbitR + 14, t * 5);
    const [x1, y1] = polar(G.orbitR + (t % 6 ? 18 : 24), t * 5);
    return `<path class="tick" d="M${x0} ${y0}L${x1} ${y1}"/>`;
  }).join('');
  const rings = L.rings.map((ring, ri) => {
    const segs = ring.segs.map((s) => {
      const [sx, sy] = polar(G.halo, s.mid);
      const [ex, ey] = polar(s.r - s.width / 2 - 3, s.mid);
      const dots = Array.from({ length: s.nv }, (_, d) => {
        const [x, y] = polar(s.r + s.width / 2 + (only ? 12 : 6) + d * G.nvStep * (only ? G.miniScale : 1), s.mid);
        return `<circle class="nv" cx="${x}" cy="${y}" r="${f(G.nvR * (only ? G.miniScale : 1))}"/>`;
      }).join('');
      const attrs = `data-i="${s.i}" data-project-name="${esc(s.projectName)}" data-session="${esc(s.id)}" data-model="${esc(s.model)}" data-effort="${esc(s.effort)}" data-minutes="${s.minutes}" data-state="${s.state}" data-pr-number="${s.pr ?? ''}" data-hours="${s.hours ?? ''}" data-nv="${s.nv}" data-url="${esc(s.url ?? '')}"`;
      return `<g class="seg ${s.cls} ${s.state}${s.nv ? ' has-nv' : ''}" ${attrs}>` +
        `<path class="spoke" d="M${sx} ${sy}L${ex} ${ey}"/>` +
        `<path class="arc" d="${arcPath(s.r, s.a0, s.a1)}" stroke-width="${s.width}"/>${dots}` +
        `<path class="hit" d="${arcPath(s.r, s.a0 - 1, s.a1 + 1)}"/></g>`;
    }).join('');
    return `<g class="ring" data-ring="${esc(ring.slug)}" style="--dur:${420 + ri * 140}s;--dir:${ri % 2 ? 'reverse' : 'normal'}">${segs}</g>`;
  }).join('');
  const part = (src: string, txt: string) => `<tspan data-src="${src}">${esc(txt)}</tspan>`;
  const lab = (r: number, inner: string, n: string | number) =>
    `<path id="${id}-l${n}" class="lpath" d="${arcPath(r - G.labelInset, G.labelStartDeg, G.labelStartDeg + G.labelSpanDeg)}"/>` +
    `<text class="rlab" font-size="${G.labelSize}" aria-hidden="true"><textPath href="#${id}-l${n}">${inner}</textPath></text>`;
  const count = (ring: Ring) => (ring.log === 'not-table' ? 'LOG NOT A TABLE' : `${ring.segs.length} SESSIONS`);
  const labels = only ? '' : L.rings.map((ring, n) =>
    lab(ring.r, part(ring.slug === 'site' ? 'site.yml' : `projects.yml#${ring.slug}`, ring.name.toUpperCase()) + ' · ' + part('mark.json', count(ring)), n)).join('') +
    (L.upstream.length ? lab(G.orbitR, 'OTHER PROJECTS · ' + part('mark.json', `${S.upstreamMerged} OF ${S.upstream} MERGED`), 'u') : '');
  const nodes = L.upstream.map((u, j) => {
    const [x, y] = polar(G.orbitR, u.angle);
    return `<circle class="up ${u.state === 'merged' ? 'merged' : 'open'}" data-u="${j}" cx="${x}" cy="${y}" r="${G.upstreamNodeR}"/>`;
  }).join('');
  const aria = only ? `${esc(L.rings[0]?.name ?? only)} sessions` : esc(markLabel(data));
  return `<svg class="mark${only ? ' mini' : ''}" viewBox="0 0 ${G.box} ${G.box}" role="img" aria-label="${aria}" tabindex="${only || still ? -1 : 0}"${only || still ? ' aria-hidden="true"' : ''}>` +
    `<defs><linearGradient id="${id}-iris" gradientUnits="userSpaceOnUse" x1="60" y1="60" x2="540" y2="540">` +
    `<stop offset="0" class="i1"/><stop offset=".5" class="i2"/><stop offset="1" class="i3"/></linearGradient></defs>` +
    `<g class="dials">${only ? `<circle class="dial" cx="${c}" cy="${c}" r="${G.ringMax}"/>` : dial + ticks + labels}</g>` +
    `<g style="--iris:url(#${id}-iris)">${rings}<g class="ring orbit" style="--dur:900s;--dir:normal">${nodes}</g></g>` +
    `<circle class="halo" cx="${c}" cy="${c}" r="${G.halo}"/><circle class="eye" cx="${c}" cy="${c}" r="${G.eye}"/></svg>`;
}

/** One row per arc (REQ-056). */
export function tableHTML(data: MarkData): string {
  const rows = data.projects.flatMap((p) => p.sessions.map((s) =>
    `<tr><td>${esc(p.name)}</td><td>${esc(s.id)}</td><td>${esc(s.model)} / ${esc(s.effort)}</td><td>${s.minutes}</td>` +
    `<td>${s.pr === null ? 'none' : `#${s.pr}, ${s.state === 'merged' ? 'merged by me' : 'not merged by me'}`}</td><td>${s.hours ?? ''}</td><td>${s.nv}</td></tr>`)).join('');
  return `<table data-src="mark.json"><thead><tr><th>Project</th><th>Session</th><th>Model / effort</th><th>Minutes</th><th>Pull request</th><th>Hours to merge</th><th>Not verified</th></tr></thead><tbody>${rows}</tbody></table>`;
}
