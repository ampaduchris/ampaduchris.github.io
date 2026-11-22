import { parse } from 'yaml';
import { validDate } from './evidence';

export const POSTMORTEM_SECTIONS = ['What happened', 'Timeline', 'Causes', 'What changed', 'What is still not known'];
const CLAIM_SECTIONS = new Set(['What happened', 'Timeline', 'Causes', 'What changed']);
const NOT_KNOWN = 'What is still not known';
// A sentence outside the claim sections is a claim when it holds one of these (spec section 6.3).
const CAUSAL = /\b(because|cause|caused|causing|led to|leading to|results? in|resulted in|due to|owing to|as a result|therefore|so that|which meant)\b/i;
const FIELDS = ['title', 'kind', 'date', 'standfirst', 'sessions', 'review'];
// Markup the reading column does not allow (DESIGN.md 7.1, REQ-084).
const NOT_ALLOWED: [RegExp, string][] = [
  [/^#{3,}\s/, 'a heading below the section level'], [/^>\s?/, 'a block quote'], [/!\[[^\]]*\]\(/, 'an image'],
  [/<(img|figure|aside|iframe|blockquote|video|audio)\b/i, 'an image, figure, aside or frame'], [/^#\s/, 'a heading of the page level'],
];

export interface Parsed { data: Record<string, unknown>; body: string }

export function parseNote(raw: string): Parsed {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, body: raw };
  return { data: (parse(m[1]) ?? {}) as Record<string, unknown>, body: m[2] };
}

export function sentenceCount(text: string): number {
  return (text.match(/[.!?](?:\s|$)/g) ?? []).length;
}

/** Names the note and the field (REQ-083). `knownSessions` are the session ids in mark.json. */
export function validateFrontmatter(data: Record<string, unknown>, knownSessions: string[]): string[] {
  const errors: string[] = [];
  for (const k of Object.keys(data)) if (!FIELDS.includes(k)) errors.push(`unknown field ${k}`);
  for (const k of ['title', 'kind', 'date', 'standfirst', 'sessions']) if (data[k] === undefined) errors.push(`missing field ${k}`);
  if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim())) errors.push('field title must be a non-empty string');
  if (data.kind !== undefined && data.kind !== 'postmortem' && data.kind !== 'essay') errors.push('field kind must be postmortem or essay');
  // A date in YAML front matter may arrive as a Date object; the day form is what is allowed.
  const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : data.date;
  if (date !== undefined && !(validDate(date) && String(date).length === 10)) errors.push('field date must be YYYY-MM-DD');
  const s = data.standfirst;
  if (s !== undefined && (typeof s !== 'string' || s.length < 50 || s.length > 300 || sentenceCount(s) > 2)) errors.push('field standfirst must be 50 to 300 characters and at most two sentences');
  for (const k of ['sessions', 'review'] as const) {
    const v = data[k];
    if (v === undefined) continue;
    if (!Array.isArray(v) || (k === 'sessions' && v.length === 0) || v.some((x) => typeof x !== 'string' && typeof x !== 'number')) { errors.push(`field ${k} must be a list of session ids`); continue; }
    for (const id of v.map(String)) if (!knownSessions.includes(id)) errors.push(`field ${k} names session ${id}, which is not in mark.json`);
  }
  return errors;
}

export interface Check { claims: number; rows: string[]; errors: string[] }

const MARK = '⟦';
const MARK_END = '⟧';

/** Replace markers and figures with plain tokens so that sentences can be split. */
function flatten(line: string): { text: string; figs: string[] } {
  const figs: string[] = [];
  const noFig = line.replace(/<Fig\s+row="([^"]+)"\s*>([\s\S]*?)<\/Fig>/g, (_m, row, inner) => { figs.push(row); return inner; });
  const text = noFig.replace(/<Ref\s+id="([^"]+)"\s*\/>/g, (_m, id) => `${MARK}${id}${MARK_END}`)
    .replace(/<\/?(Timeline|Event)\b[^>]*>/g, '').trim();
  return { text, figs };
}

// A full stop between two digits (5.5, 0.1) does not end a sentence.
const DOT = '\u2024';

function sentences(raw: string): { s: string; marks: string[] }[] {
  const text = raw.replace(/(\d)\.(?=\d)/g, `$1${DOT}`);
  const out: { s: string; marks: string[] }[] = [];
  const re = new RegExp(`[^.!?]+[.!?](?:${MARK}[^${MARK_END}]+${MARK_END})*|[^.!?]+$`, 'g');
  for (const m of text.match(re) ?? []) {
    const marks = [...m.matchAll(new RegExp(`${MARK}([^${MARK_END}]+)${MARK_END}`, 'g'))].map((x) => x[1]);
    const plain = m.replace(new RegExp(`${MARK}[^${MARK_END}]+${MARK_END}`, 'g'), '').replaceAll(DOT, '.').trim();
    if (plain) out.push({ s: plain, marks });
  }
  return out;
}

/** The claims checker (REQ-073, REQ-082, REQ-084). `body` is the note without its front matter. */
export function checkNote(body: string, evidenceIds: Iterable<string>, name: string, kind: string): Check {
  const known = new Set(evidenceIds);
  const errors: string[] = [];
  const rows = new Set<string>();
  const headings: string[] = [];
  let section = '';
  let claims = 0;
  let markers = 0;
  let inCode = false;
  const fail = (msg: string) => errors.push(`${name}: ${msg}`);

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('```')) { inCode = !inCode; continue; }
    if (inCode || !line) continue;
    for (const [re, what] of NOT_ALLOWED) if (re.test(line)) fail(`${what} is not allowed in a note`);
    const h = /^##\s+(.*)$/.exec(line);
    if (h) { section = h[1].trim(); headings.push(section); continue; }
    if (section === NOT_KNOWN) continue;
    if (/^<\/?(ul|ol)\b/.test(line) || line === '<Timeline>' || line === '</Timeline>') continue;
    const { text, figs } = flatten(line.replace(/^([-*]|\d+\.)\s+/, '').replace(/^<li>([\s\S]*)<\/li>$/, '$1'));
    for (const f of figs) { rows.add(f); if (!known.has(f)) fail(`a figure names row ${f}, which is not in evidence.yml`); }
    const inClaimSection = kind === 'postmortem' && CLAIM_SECTIONS.has(section);
    for (const { s, marks } of sentences(text)) {
      markers += marks.length;
      for (const id of marks) { rows.add(id); if (!known.has(id)) fail(`a marker names row ${id}, which is not in evidence.yml`); }
      if (inClaimSection || CAUSAL.test(s)) {
        claims += 1;
        if (marks.length === 0) fail(`claim with no evidence row (${section || 'before the first section'}): "${s}"`);
      }
    }
  }
  if (markers === 0) fail('the note holds no marker, so it has no evidence row');
  if (kind === 'postmortem') {
    const expected = POSTMORTEM_SECTIONS;
    if (headings.join('|') !== expected.join('|')) {
      const missing = expected.filter((e) => !headings.includes(e));
      fail(missing.length ? `postmortem is missing the section ${missing.join(', ')}` : `postmortem sections are out of order or repeated: ${headings.join(', ')}`);
    }
  }
  const ordered = [...rows].filter((r) => known.has(r)).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  return { claims, rows: ordered, errors };
}
