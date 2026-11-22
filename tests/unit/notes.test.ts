import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';
import { XMLParser } from 'fast-xml-parser';
import { describe, expect, test } from 'vitest';
import { validateEvidence, formatEvidenceDate, loadEvidence } from '../../src/lib/evidence';
import { parseNote, checkNote, validateFrontmatter } from '../../src/lib/claims';
import { provenanceTags, buildFeed, sortNotes, BYLINE, historyUrl } from '../../src/lib/notes';

const row = (over: Record<string, unknown> = {}) => ({ id: 'E1', date: '2026-10-19', observation: 'A thing was seen.', ...over });
const ids = ['E1', 'E2', 'E3'];
const read = (p: string) => readFileSync(`tests/fixtures/claims/${p}`, 'utf8');
const ev = new Set(ids);

const POST = (sections: Record<string, string>) =>
  Object.entries(sections).map(([h, b]) => `## ${h}\n\n${b}\n`).join('\n');
const FULL = {
  'What happened': 'A sentence.<Ref id="E1" />',
  Timeline: '<Timeline>\n<Event date="2026-10-19">Event.<Ref id="E1" /></Event>\n</Timeline>',
  Causes: '1. A cause.<Ref id="E2" />',
  'What changed': '- A change.<Ref id="E3" />',
  'What is still not known': '<ul className="unknown">\n<li>A question.</li>\n</ul>',
};

describe('evidence file schema', () => {
  test('[REQ-079] a valid row passes, and recorded is optional', () => {
    expect(validateEvidence([row(), row({ id: 'E2', recorded: 'a log' })])).toEqual([]);
  });
  test.each([
    ['missing id', { id: undefined }, 'id'],
    ['missing date', { date: undefined }, 'date'],
    ['missing observation', { observation: undefined }, 'observation'],
    ['unknown field', { colour: 'red' }, 'colour'],
    ['id not E and digits', { id: 'row-1' }, 'id'],
    ['date not a day or a month', { date: '19 Oct 2026' }, 'date'],
    ['date with a month of 13', { date: '2026-13' }, 'date'],
    ['empty observation', { observation: '   ' }, 'observation'],
    ['recorded not a string', { recorded: 4 }, 'recorded'],
  ])('[REQ-079] %s fails and names the row and the field', (_n, over, field) => {
    const errors = validateEvidence([row(over)]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join('\n')).toContain('E1');
    expect(errors.join('\n')).toContain(field);
  });
  test('[REQ-079] a repeated id fails', () => {
    expect(validateEvidence([row(), row()]).join('\n')).toContain('repeats');
  });
  test('[REQ-079] the committed file is valid and loads', () => {
    expect(validateEvidence(parse(readFileSync('src/data/evidence.yml', 'utf8')))).toEqual([]);
    expect(loadEvidence().length).toBeGreaterThan(0);
  });
});

describe('evidence file contents', () => {
  const bad = (text: string) => validateEvidence([row({ observation: text })]).join('\n');
  test.each([
    ['a URL', 'See https://example.org/page for it.'],
    ['a www address', 'See www.example.org.'],
    ['an email address', 'Written to someone@example.org.'],
    ['an at sign', 'The handle @someone was used.'],
    ['five digits', 'The code 12345 was shown.'],
  ])('[REQ-080] %s is refused', (_n, text) => {
    expect(bad(text)).toContain('E1');
  });
  test('[REQ-080] four digits are allowed', () => {
    expect(bad('It ran in 2026.')).toBe('');
  });
  test('[REQ-080] the committed file holds none of the patterns', () => {
    const text = readFileSync('src/data/evidence.yml', 'utf8');
    expect(text).not.toMatch(/https?:|www\.|@|\d{5,}/);
  });
});

describe('evidence dates', () => {
  test('[REQ-081] a day shows as day, month, year; a month shows as month, year', () => {
    expect(formatEvidenceDate('2026-10-19')).toEqual({ text: '19 Oct 2026', datetime: '2026-10-19' });
    expect(formatEvidenceDate('2026-10')).toEqual({ text: 'Oct 2026', datetime: '2026-10' });
  });
});

describe('claims checker: definition of a claim', () => {
  const post = (over: Partial<typeof FULL>) => POST({ ...FULL, ...over });
  test('[REQ-082] a postmortem that cites a row for every sentence passes and counts its claims', () => {
    const r = checkNote(post({}), ev, 'n', 'postmortem');
    expect(r.errors).toEqual([]);
    expect(r.claims).toBe(4);
    expect(r.rows).toEqual(['E1', 'E2', 'E3']);
  });
  test('[REQ-082] two markers after one sentence are both counted as rows, once each', () => {
    const r = checkNote(post({ 'What happened': 'A sentence.<Ref id="E1" /><Ref id="E2" />' }), ev, 'n', 'postmortem');
    expect(r.errors).toEqual([]);
    expect(r.rows).toEqual(['E1', 'E2', 'E3']);
  });
  test('[REQ-082] a sentence under What changed with no marker fails', () => {
    const r = checkNote(post({ 'What changed': '- A change with no row.' }), ev, 'n', 'postmortem');
    expect(r.errors.join('\n')).toContain('A change with no row.');
  });
  test('[REQ-082] in an essay a sentence with a causal word needs a marker and one without does not', () => {
    const body = POST({ Argument: 'A plain sentence. A run was lost because of a limit.' });
    expect(checkNote(body, ev, 'n', 'essay').errors.join('\n')).toContain('because of a limit');
    expect(checkNote(body, ev, 'n', 'essay').errors.join('\n')).not.toContain('A plain sentence');
  });
  test('[REQ-082] the not-known section holds no claims', () => {
    const r = checkNote(post({ 'What is still not known': '<ul className="unknown">\n<li>A cause is likely and not shown.</li>\n</ul>' }), ev, 'n', 'postmortem');
    expect(r.errors).toEqual([]);
  });
  test('[REQ-082] a figure naming a missing row fails', () => {
    const r = checkNote(post({ 'What happened': 'It ran <Fig row="E9">about 50 minutes</Fig>.<Ref id="E1" />' }), ev, 'n', 'postmortem');
    expect(r.errors.join('\n')).toContain('E9');
  });
  test('[REQ-082] a note with no marker fails', () => {
    const r = checkNote(POST({ Argument: 'A plain sentence.' }), ev, 'n', 'essay');
    expect(r.errors.join('\n')).toContain('no marker');
  });
});

describe('claims checker: planted cases', () => {
  const run = (dir: string) =>
    spawnSync('npx', ['tsx', 'scripts/check-claims.ts', `tests/fixtures/claims/${dir}`, 'tests/fixtures/claims/evidence.yml'], { encoding: 'utf8' });
  test('[REQ-082] the good note passes', () => {
    const r = run('good');
    expect(r.stdout + r.stderr).toContain('1 note');
    expect(r.status).toBe(0);
  });
  test('[REQ-082] planted case 1: a claim with no row fails and the sentence is named', () => {
    const r = run('no-row');
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('This claim has no row at all.');
  });
  test('[REQ-082] planted case 2: a marker to a missing row fails and the row is named', () => {
    const r = run('missing-row');
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toContain('E99');
  });
  test('[REQ-082] the real notes pass against the real evidence file', () => {
    const r = spawnSync('npx', ['tsx', 'scripts/check-claims.ts'], { encoding: 'utf8' });
    expect(r.status).toBe(0);
  });
  test('[REQ-082] CI runs the checker', () => {
    expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toMatch(/npm run claims/);
  });
});

describe('postmortem form', () => {
  test('[REQ-073] a postmortem missing a section fails', () => {
    const { Causes: _c, ...rest } = FULL;
    expect(checkNote(POST(rest), ev, 'n', 'postmortem').errors.join('\n')).toContain('Causes');
  });
  test('[REQ-073] a postmortem with sections out of order fails', () => {
    const swapped = POST({ ...FULL, Timeline: FULL['What happened'], 'What happened': FULL.Timeline });
    const r = checkNote(swapped, ev, 'n', 'postmortem');
    expect(r.errors.join('\n')).toMatch(/order|Timeline/);
  });
  test('[REQ-073] an essay may use its own headings', () => {
    expect(checkNote(POST({ Argument: 'A plain sentence.<Ref id="E1" />' }), ev, 'n', 'essay').errors).toEqual([]);
  });
});

describe('reading column', () => {
  test.each([
    ['an h3 heading', '### A sub-heading'],
    ['a block quote', '> A quoted line.'],
    ['an image', '![alt](a.png)'],
    ['an img element', '<img src="a.png" alt="" />'],
    ['a figure element', '<figure>x</figure>'],
    ['an aside', '<aside>x</aside>'],
    ['a frame', '<iframe src="a"></iframe>'],
  ])('[REQ-084] %s in a note is refused by the checker', (_n, markup) => {
    const body = POST({ ...FULL, 'What happened': `A sentence.<Ref id="E1" />\n\n${markup}` });
    expect(checkNote(body, ev, 'n', 'postmortem').errors.join('\n')).toMatch(/not allowed/);
  });
});

describe('note front matter', () => {
  const fm = (over: Record<string, unknown> = {}) => ({
    title: 'T', kind: 'postmortem', date: '2026-11-10', standfirst: 'One sentence that is long enough. Two sentences in all.', sessions: ['F.5'], ...over,
  });
  const known = ['F.5', 'F.3'];
  test('[REQ-083] a valid front matter passes and review is optional', () => {
    expect(validateFrontmatter(fm(), known)).toEqual([]);
    expect(validateFrontmatter(fm({ review: ['F.3'] }), known)).toEqual([]);
  });
  test.each([
    ['title', { title: undefined }],
    ['kind', { kind: 'story' }],
    ['date', { date: '2026-11' }],
    ['standfirst', { standfirst: 'One. Two. Three. Four enough characters to pass the floor.' }],
    ['standfirst', { standfirst: 'Too short.' }],
    ['sessions', { sessions: [] }],
    ['sessions', { sessions: ['9.9'] }],
    ['colour', { colour: 'red' }],
  ])('[REQ-083] a bad %s fails and names the field', (field, over) => {
    const errors = validateFrontmatter(fm(over), known);
    expect(errors.join('\n')).toContain(field);
  });
  test('[REQ-083] parseNote splits front matter and body', () => {
    const n = parseNote(read('good/note.mdx'));
    expect(n.data.kind).toBe('postmortem');
    expect(n.body).toContain('## What happened');
  });
});

describe('provenance and byline', () => {
  const sessions = [
    { session: 'F.5', model: 'Sonnet 5.5', effort: 'high' },
    { session: 'F.6', model: 'Sonnet 5.5', effort: 'high' },
    { session: 'F.3', model: 'Opus 5.5', effort: 'high' },
    { session: 'F.4', model: 'Sonnet 5.5', effort: 'low' },
  ];
  test('[REQ-076] one tag per distinct model and effort, in order of first use, with the session count', () => {
    expect(provenanceTags(['F.4', 'F.5', 'F.6'], [], sessions)).toEqual([
      { label: 'Sonnet 5.5 / low · 1 session', model: 'Sonnet 5.5 / low' },
      { label: 'Sonnet 5.5 / high · 2 sessions', model: 'Sonnet 5.5 / high' },
    ]);
  });
  test('[REQ-076] a review session gets its own tag ending ", the review"', () => {
    const tags = provenanceTags(['F.5'], ['F.3'], sessions);
    expect(tags.map((t) => t.label)).toEqual(['Sonnet 5.5 / high · 1 session', 'Opus 5.5 / high · 1 session, the review']);
  });
  test('[REQ-076] a session absent from the data throws rather than showing a made-up tag', () => {
    expect(() => provenanceTags(['Z.9'], [], sessions)).toThrow(/Z\.9/);
  });
  test('[REQ-076] the byline is word for word and the history link points at the file in the repository', () => {
    expect(BYLINE).toBe('Drafted with Claude from my outline and evidence. Edited by me.');
    expect(historyUrl('https://github.com/example/site', 'a-note')).toBe('https://github.com/example/site/commits/main/src/content/notes/a-note.mdx');
  });
});

describe('feed', () => {
  const notes = [
    { slug: 'old', title: 'Old note', date: '2026-11-10', standfirst: 'Old standfirst.' },
    { slug: 'new', title: 'New & note', date: '2026-11-15', standfirst: 'New standfirst.' },
  ];
  const xml = buildFeed(sortNotes(notes), 'https://example.org');
  const doc = new XMLParser({ ignoreAttributes: false }).parse(xml);
  test('[REQ-075] the feed is well-formed RSS 2.0 with a channel title, link and description', () => {
    expect(doc.rss['@_version']).toBe('2.0');
    expect(doc.rss.channel.title).toBeTruthy();
    expect(doc.rss.channel.link).toBe('https://example.org/notes/');
    expect(doc.rss.channel.description).toBeTruthy();
  });
  test('[REQ-075] one item per note, newest first, with title, absolute link, guid, RFC 822 date and standfirst', () => {
    const items = doc.rss.channel.item;
    expect(items.map((i: any) => i.title)).toEqual(['New & note', 'Old note']);
    expect(items[0].link).toBe('https://example.org/notes/new/');
    expect(items[0].guid['#text'] ?? items[0].guid).toBe('https://example.org/notes/new/');
    expect(items[0].pubDate).toBe('Sun, 15 Nov 2026 00:00:00 GMT');
    expect(items[0].description).toBe('New standfirst.');
  });
  test('[REQ-070] notes sort newest first', () => {
    expect(sortNotes(notes).map((n) => n.slug)).toEqual(['new', 'old']);
  });
});

describe('sitemap', () => {
  test('[REQ-086] the Astro config does not filter notes pages out of the sitemap', () => {
    const cfg = readFileSync('astro.config.mjs', 'utf8');
    expect(cfg).toContain('sitemap(');
    expect(cfg).not.toMatch(/notes/);
  });
});
