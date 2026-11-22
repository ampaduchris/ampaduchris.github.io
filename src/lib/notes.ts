import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkNote, parseNote, validateFrontmatter } from './claims';
import { loadEvidence, type EvidenceRow } from './evidence';

export const BYLINE = 'Drafted with Claude from my outline and evidence. Edited by me.';
export const NOTES_DIR = 'src/content/notes';
export const FIXTURE_DIR = 'tests/fixtures/notes';
// NOTES_FIXTURE=none points at a folder that does not exist: a build with no note, for the empty state (REQ-071).
export const EMPTY_DIR = 'tests/fixtures/notes-none';

export interface SessionRef { session: string; model: string; effort: string }
export interface Tag { label: string; model: string }
export interface Note {
  slug: string; title: string; kind: 'postmortem' | 'essay'; date: string; standfirst: string;
  sessions: string[]; review: string[]; claims: number; rows: EvidenceRow[];
}
export interface FeedNote { slug: string; title: string; date: string; standfirst: string }

const plural = (n: number) => `${n} ${n === 1 ? 'session' : 'sessions'}`;

/** One tag for each distinct model and effort among the sessions, then for the review sessions; first use first (REQ-076). */
export function provenanceTags(sessions: string[], review: string[], data: SessionRef[]): Tag[] {
  const find = (id: string) => {
    const s = data.find((d) => d.session === id);
    if (!s) throw new Error(`session ${id} is not in the build log data`);
    return `${s.model} / ${s.effort}`;
  };
  const groups = new Map<string, { model: string; count: number; review: boolean }>();
  for (const [ids, isReview] of [[sessions, false], [review, true]] as const) {
    for (const id of ids) {
      const model = find(id);
      const key = `${isReview}|${model}`;
      const g = groups.get(key) ?? { model, count: 0, review: isReview };
      g.count += 1;
      groups.set(key, g);
    }
  }
  return [...groups.values()].map((g) => ({ model: g.model, label: `${g.model} · ${plural(g.count)}${g.review ? ', the review' : ''}` }));
}

export function historyUrl(repoUrl: string, slug: string): string {
  return `${repoUrl}/commits/main/${NOTES_DIR}/${slug}.mdx`;
}

export function sortNotes<T extends { date: string }>(notes: T[]): T[] {
  return [...notes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** The description of a page: the standfirst, cut at a word if it is over 160 characters (REQ-012). */
export function describe(standfirst: string): string {
  if (standfirst.length <= 160) return standfirst;
  const cut = standfirst.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(' '))}...`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** RSS 2.0, notes already newest first (REQ-075). */
export function buildFeed(notes: FeedNote[], siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, '');
  const items = notes.map((n) => {
    const link = `${base}/notes/${n.slug}/`;
    return `    <item>\n      <title>${esc(n.title)}</title>\n      <link>${link}</link>\n      <guid isPermaLink="true">${link}</guid>\n      <pubDate>${new Date(`${n.date}T00:00:00Z`).toUTCString()}</pubDate>\n      <description>${esc(n.standfirst)}</description>\n    </item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n    <title>Notes by Chris Ampadu</title>\n    <link>${base}/notes/</link>\n    <description>What failed, what I think caused it, and the evidence for each claim.</description>\n    <language>en-GB</language>\n${items.join('\n')}\n  </channel>\n</rss>\n`;
}

export function notesDir(root = process.cwd()): string {
  const f = process.env.NOTES_FIXTURE;
  return resolve(root, f === 'none' ? EMPTY_DIR : f ? FIXTURE_DIR : NOTES_DIR);
}

export interface Source { slug: string; file: string; raw: string }

export function loadSources(dir: string): Source[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.mdx')).sort()
    .map((f) => ({ slug: f.replace(/\.mdx$/, ''), file: f, raw: readFileSync(resolve(dir, f), 'utf8') }));
}

/** Every error in every note, so that one build shows them all (REQ-082, REQ-083). */
export function checkAll(sources: Source[], evidence: EvidenceRow[], knownSessions: string[]): { notes: Note[]; errors: string[]; checked: number } {
  const errors: string[] = [];
  const notes: Note[] = [];
  const byId = new Map(evidence.map((r) => [r.id, r]));
  for (const src of sources) {
    const { data, body } = parseNote(src.raw);
    const fm = validateFrontmatter(data, knownSessions);
    for (const e of fm) errors.push(`${src.file}: ${e}`);
    const kind = data.kind === 'essay' ? 'essay' : 'postmortem';
    const check = checkNote(body, evidence.map((r) => r.id), src.file, kind);
    errors.push(...check.errors);
    if (fm.length === 0 && check.errors.length === 0) {
      const date = data.date instanceof Date ? data.date.toISOString().slice(0, 10) : String(data.date);
      notes.push({
        slug: src.slug, title: String(data.title), kind, date, standfirst: String(data.standfirst),
        sessions: (data.sessions as unknown[]).map(String), review: ((data.review as unknown[] | undefined) ?? []).map(String),
        claims: check.claims, rows: check.rows.map((id) => byId.get(id)!),
      });
    }
  }
  return { notes, errors, checked: sources.length };
}

let cache: { key: string; notes: Note[] } | null = null;

/** The validated notes, newest first. A failing note fails the build (REQ-082). */
export async function loadNotes(): Promise<Note[]> {
  const key = `${process.env.NOTES_FIXTURE ?? ''}|${process.env.MARK_FIXTURE ?? ''}`;
  if (cache?.key === key) return cache.notes;
  const { loadMarkData } = await import('./markdata');
  const known = loadMarkData().projects.flatMap((p) => p.sessions.map((s) => s.id));
  const { notes, errors } = checkAll(loadSources(notesDir()), loadEvidence(), known);
  if (errors.length) throw new Error(`notes are invalid:\n  ${errors.join('\n  ')}`);
  cache = { key, notes: sortNotes(notes) };
  return cache.notes;
}

export async function loadSessionRefs(): Promise<SessionRef[]> {
  const { loadMarkData } = await import('./markdata');
  return loadMarkData().projects.flatMap((p) => p.sessions.map((s) => ({ session: s.id, model: s.model, effort: s.effort })));
}
