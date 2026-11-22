import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

// The fixture build (npm run build:fixture) holds three synthetic notes from tests/fixtures/notes/ and is served on 4322.
// The real build (4321) holds the published notes. The empty build (4323, NOTES_FIXTURE=none) holds none, for the empty state (REQ-071).
const FIX = 'http://127.0.0.1:4322';
const REAL = 'http://127.0.0.1:4321';
const EMPTY = 'http://127.0.0.1:4323';
const NOTE_ROUTES = ['/notes/', '/notes/postmortem-a/', '/notes/postmortem-b/', '/notes/essay-a/'];
const evidence = parse(readFileSync('src/data/evidence.yml', 'utf8')) as { id: string; date: string }[];
const hrefs = (page: Page, sel: string) => page.$$eval(sel, (els) => els.map((e) => e.getAttribute('href')));
const texts = (page: Page, sel: string) => page.$$eval(sel, (els) => els.map((e) => (e.textContent ?? '').trim()));
const idNum = (id: string) => Number(id.slice(1));

test('[REQ-071] with no note the index shows its headline and one sentence, and nothing else', async ({ page }) => {
  await page.goto(`${EMPTY}/notes/`);
  await expect(page.locator('h1')).toHaveText('What failed, what I think caused it, and the evidence for each claim.');
  await expect(page.locator('main')).toContainText('Nothing published yet.');
  await expect(page.locator('.entries, .feed, .listhead, [data-block=entries]')).toHaveCount(0);
});

test('[REQ-071] with no note there is no Notes link, no feed link in any head, and no feed file', async ({ page, request }) => {
  for (const r of ['/', '/method/', '/notes/']) {
    await page.goto(`${EMPTY}${r}`);
    expect(await texts(page, 'header.site nav a')).toEqual(['Method', 'Contact']);
    await expect(page.locator('link[rel=alternate][type="application/rss+xml"]')).toHaveCount(0);
  }
  expect((await request.get(`${EMPTY}/notes/feed.xml`)).status()).toBe(404);
});

test('[REQ-070] the index lists three notes newest first with kind, date, title, standfirst, rows and model', async ({ page }) => {
  await page.goto(`${FIX}/notes/`);
  await expect(page.locator('#h-notes')).toHaveText('3 notes, newest first');
  await expect(page.locator('.listhead .feed')).toHaveText('Follow by RSS feed');
  const entries = page.locator('a.entry');
  await expect(entries).toHaveCount(3);
  expect(await hrefs(page, 'a.entry')).toEqual(['/notes/essay-a/', '/notes/postmortem-b/', '/notes/postmortem-a/']);
  expect(await texts(page, 'a.entry .kind')).toEqual(['Essay', 'Postmortem', 'Postmortem']);
  expect(await page.$$eval('a.entry time', (ts) => ts.map((t) => t.getAttribute('datetime')))).toEqual(['2026-11-15', '2026-11-12', '2026-11-10']);
  await expect(entries.nth(0).locator('h3')).toHaveText('Fixture essay A');
  await expect(entries.nth(0).locator('.stand')).toContainText('A synthetic essay used only by the fixture build.');
  // Postmortem A cites seven rows and was drafted by session F.5 (Sonnet 5.5 / high).
  await expect(entries.nth(2).locator('.facts')).toHaveText('7 evidence rows · Sonnet 5.5 / high');
  await expect(entries.nth(0).locator('.facts')).toHaveText('3 evidence rows · Sonnet 5.5 / high');
});

test('[REQ-072] a note page shows head, statistics, body, evidence and the link row in that order', async ({ page }) => {
  await page.goto(`${FIX}/notes/postmortem-a/`);
  expect(await page.$$eval('[data-block]', (els) => els.map((e) => e.getAttribute('data-block')))).toEqual(
    ['header', 'note-head', 'note-numbers', 'body', 'evidence', 'note-links', 'footer']);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveText('Fixture postmortem A');
  await expect(page.locator('.ahead .kicker')).toHaveText('Notes · Postmortem · 10 Nov 2026');
  await expect(page.locator('.ahead .kicker a')).toHaveAttribute('href', '/notes/');
  await expect(page.locator('.ahead .lede')).toContainText('A synthetic postmortem used only by the fixture build.');
  expect(await hrefs(page, '[data-block=note-links] a')).toEqual(['/notes/', '/notes/feed.xml']);
  expect(await texts(page, '[data-block=note-links] a')).toEqual(['All notes', 'Follow by RSS feed']);
});

test('[REQ-073] a postmortem has the five headings in order, then Evidence; an essay has its own', async ({ page }) => {
  await page.goto(`${FIX}/notes/postmortem-a/`);
  expect(await texts(page, '.prose h2')).toEqual(['What happened', 'Timeline', 'Causes', 'What changed', 'What is still not known', 'Evidence']);
  await page.goto(`${FIX}/notes/essay-a/`);
  expect(await texts(page, '.prose h2')).toEqual(['The argument', 'What the rows show', 'Evidence']);
  await expect(page.locator('ul.unknown, ol.timeline')).toHaveCount(0);
});

test('[REQ-073] the timeline and the not-known list use the designed markup', async ({ page }) => {
  await page.goto(`${FIX}/notes/postmortem-a/`);
  await expect(page.locator('ol.timeline li')).toHaveCount(2);
  await expect(page.locator('ol.timeline li').first().locator('time')).toHaveText('19 Oct 2026');
  await expect(page.locator('ul.unknown li')).toHaveCount(2);
});

test('[REQ-074] the header lists Notes, Method, Contact; Notes is current on the index only', async ({ page }) => {
  for (const [route, current] of [['/', null], ['/notes/', 'Notes'], ['/notes/postmortem-a/', null], ['/method/', 'Method']] as const) {
    await page.goto(`${FIX}${route}`);
    expect(await texts(page, 'header.site nav a')).toEqual(['Notes', 'Method', 'Contact']);
    const cur = await page.$$eval('header.site nav a[aria-current=page]', (els) => els.map((e) => (e.textContent ?? '').trim()));
    expect(cur).toEqual(current ? [current] : []);
  }
});

test('[REQ-075] every head links to the feed, and the feed holds an item per note, newest first', async ({ page, request }) => {
  for (const r of ['/', '/notes/', '/notes/essay-a/', '/contact/']) {
    await page.goto(`${FIX}${r}`);
    await expect(page.locator('link[rel=alternate][type="application/rss+xml"]')).toHaveAttribute('href', '/notes/feed.xml');
  }
  const res = await request.get(`${FIX}/notes/feed.xml`);
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain('<rss version="2.0"');
  expect([...xml.matchAll(/<item>/g)].length).toBe(3);
  expect(xml.indexOf('Fixture essay A')).toBeLessThan(xml.indexOf('Fixture postmortem B'));
  expect(xml.indexOf('Fixture postmortem B')).toBeLessThan(xml.indexOf('Fixture postmortem A'));
});

test('[REQ-076] the byline has the tags, the sentence word for word and the history link', async ({ page }) => {
  await page.goto(`${FIX}/notes/postmortem-a/`);
  const by = page.locator('p.byline');
  expect(await texts(page, 'p.byline .prov')).toEqual(['Sonnet 5.5 / high · 2 sessions', 'Opus 5.5 / high · 1 session, the review']);
  await expect(by).toContainText('Drafted with Claude from my outline and evidence. Edited by me.');
  const link = by.getByRole('link', { name: 'History of this note' });
  await expect(link).toHaveAttribute('href', 'https://github.com/ampaduchris/ampaduchris.github.io/commits/main/src/content/notes/postmortem-a.mdx');
});

test('[REQ-077] the head statistics show the claim count and the row count with their sample sizes', async ({ page }) => {
  await page.goto(`${FIX}/notes/postmortem-a/`);
  const stats = page.locator('[data-block=note-numbers] [data-stat]');
  await expect(stats).toHaveCount(2);
  // Eight claims (two, two, two, two under the four sections) and seven distinct rows.
  await expect(stats.nth(0).locator('.v')).toHaveText('8');
  await expect(stats.nth(0).locator('[data-n]')).toHaveText('n = 8');
  await expect(stats.nth(0)).toHaveAttribute('aria-label', /n = 8/);
  await expect(stats.nth(1).locator('.v')).toHaveText('7');
  await expect(stats.nth(1).locator('[data-n]')).toHaveText('n = 7');
  await expect(page.locator('table.evidence tbody tr')).toHaveCount(7);
});

test('[REQ-078] each marker shows its row id, is named for it and links to a row in the same page; rows are the cited set in id order', async ({ page }) => {
  await page.goto(`${FIX}/notes/postmortem-a/`);
  const refs = await page.$$eval('a.ref', (els) => els.map((e) => ({ t: (e.textContent ?? '').trim(), a: e.getAttribute('aria-label'), h: e.getAttribute('href') })));
  expect(refs.length).toBeGreaterThan(0);
  for (const r of refs) {
    expect(r.a).toBe(`Evidence row ${r.t}`);
    expect(r.h).toBe(`#${r.t.toLowerCase()}`);
    await expect(page.locator(`table.evidence tr${r.h}`)).toHaveCount(1);
  }
  const rowIds = await texts(page, 'table.evidence tbody td.id');
  expect(rowIds).toEqual(['E1', 'E4', 'E6', 'E7', 'E9', 'E10', 'E11']);
  expect(rowIds.map(idNum)).toEqual([...rowIds.map(idNum)].sort((a, b) => a - b));
  // Every row in the table comes from evidence.yml with its own date.
  for (const id of rowIds) {
    const src = evidence.find((e) => e.id === id)!;
    await expect(page.locator(`table.evidence tr#${id.toLowerCase()} time`)).toHaveAttribute('datetime', String(src.date));
  }
});

test('[REQ-081] evidence dates show a day or a month and no more', async ({ page }) => {
  await page.goto(`${FIX}/notes/postmortem-a/`);
  const shown = await texts(page, 'table.evidence time');
  expect(shown.length).toBeGreaterThan(0);
  for (const t of shown) expect(t).toMatch(/^(\d{1,2} )?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/);
  const months = await page.$$eval('table.evidence time', (ts) => ts.filter((t) => /^\d{4}-\d{2}$/.test(t.getAttribute('datetime') ?? '')).map((t) => t.textContent!.trim()));
  for (const m of months) expect(m).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
});

test('[REQ-084] the reading column holds only the permitted elements', async ({ page }) => {
  for (const r of ['/notes/postmortem-a/', '/notes/postmortem-b/', '/notes/essay-a/']) {
    await page.goto(`${FIX}${r}`);
    const tags = await page.$$eval('.prose *', (els) => [...new Set(els.map((e) => e.tagName))]);
    const allowed = new Set(['P', 'H2', 'UL', 'OL', 'LI', 'A', 'TIME', 'SPAN', 'CODE', 'PRE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'DIV', 'ABBR', 'EM', 'STRONG']);
    expect(tags.filter((t) => !allowed.has(t)), r).toEqual([]);
    await expect(page.locator('.prose img, .prose figure, .prose blockquote, .prose aside, .prose iframe, .prose h1, .prose h3, .prose h4')).toHaveCount(0);
  }
});

for (const route of NOTE_ROUTES) {
  test(`[REQ-085] one h1, a unique title, a description of 50 to 160 characters and no percent sign or em dash on ${route}`, async ({ page }) => {
    await page.goto(`${FIX}${route}`);
    await expect(page.locator('h1')).toHaveCount(1);
    const d = (await page.locator('meta[name=description]').getAttribute('content'))!;
    expect(d.length).toBeGreaterThanOrEqual(50);
    expect(d.length).toBeLessThanOrEqual(160);
    expect(await page.locator('main').innerText()).not.toContain('%');
    expect(await page.locator('body').innerText()).not.toContain('—');
  });

  test(`[REQ-085] every number on ${route} names its source`, async ({ page }) => {
    await page.goto(`${FIX}${route}`);
    const ids = evidence.map((e) => e.id);
    const problems = await page.evaluate((ids) => {
      const bad: string[] = [];
      const allowed = (v: string) => v === 'mark.json' || v === 'content' || v === 'site.yml'
        || (v.startsWith('evidence.yml#') && ids.includes(v.slice(13))) || ['note#count', 'note#claims', 'note#rows'].includes(v);
      const walker = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const text = (n.textContent ?? '').trim();
        if (!/\d/.test(text)) continue;
        const el = n.parentElement!.closest('[data-src]') as HTMLElement | null;
        if (!el) { bad.push(`no source: ${text}`); continue; }
        const v = el.getAttribute('data-src')!;
        if (!allowed(v)) bad.push(`value not allowed (${v}): ${text}`);
        if (['MAIN', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV', 'HEADER', 'FOOTER'].includes(el.tagName) || el.querySelector('h1, h2, h3')) bad.push(`source on a container: ${text}`);
      }
      return bad;
    }, ids);
    expect(problems).toEqual([]);
  });

  test(`[REQ-085] ${route} shows the same main text with scripts off`, async ({ browser }) => {
    const on = await browser.newPage();
    await on.goto(FIX + route);
    const withJs = await on.locator('main').innerText();
    await on.close();
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const off = await ctx.newPage();
    await off.goto(FIX + route);
    expect(await off.locator('main').innerText()).toBe(withJs);
    await ctx.close();
  });

  test(`[REQ-085] the first Tab reaches the skip link on ${route}`, async ({ page }) => {
    await page.goto(`${FIX}${route}`);
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveText('Skip to content');
  });

  for (const width of [320, 375, 768, 1280]) {
    test(`[REQ-085] ${route} does not scroll sideways at ${width} pixels`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${FIX}${route}`);
      const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
      expect(sw).toBeLessThanOrEqual(cw);
    });
  }

  for (const [label, width] of [['narrow', 375], ['wide', 1280]] as const) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`[REQ-085] axe finds no serious or critical issue on ${route}, ${label}, ${scheme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${FIX}${route}`);
        if (scheme === 'dark') await page.locator('[data-theme-toggle]').click();
        await page.evaluate(() => Promise.all(document.getAnimations().filter((a) => a instanceof CSSTransition).map((a) => a.finished.catch(() => undefined))));
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }
  }
}

test('[REQ-070][REQ-077][REQ-078] the published notes list newest first, and each note links every marker to a row in its own table', async ({ page }) => {
  await page.goto(`${REAL}/notes/`);
  const slugs = (await hrefs(page, 'a.entry')).map((h) => h!.replace(/^\/notes\/|\/$/g, ''));
  expect(slugs.length).toBeGreaterThan(0);
  await expect(page.locator('#h-notes')).toHaveText(`${slugs.length} ${slugs.length === 1 ? 'note' : 'notes'}, newest first`);
  for (const slug of slugs) {
    await page.goto(`${REAL}/notes/${slug}/`);
    const refs = await texts(page, 'a.ref');
    const rows = await texts(page, 'table.evidence td.id');
    expect(refs.length).toBeGreaterThan(0);
    for (const r of refs) expect(rows).toContain(r);
    expect(rows).toEqual([...rows].sort((a, b) => idNum(a) - idNum(b)));
    expect(new Set(refs)).toEqual(new Set(rows));
    await expect(page.locator('[data-block=note-numbers] [data-src="note#rows"]')).toContainText(String(rows.length));
  }
});
