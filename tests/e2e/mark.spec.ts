import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const mark = JSON.parse(readFileSync('src/data/mark.json', 'utf8'));
const records: any[] = mark.projects.flatMap((p: any) => p.sessions.map((s: any) => ({ ...s, repo: p.repo })));
const total = records.length;
const nv = records.reduce((a, s) => a + s.not_verified, 0);
const merged = records.filter((s) => s.merged_by_owner).length;
const lookup = (project: string, session: string) => records.find((r) => r.session === session && (r.repo.endsWith(`/${project}`) || (project === 'this site' && r.repo.endsWith('github.io'))));

test('[REQ-053] the mark is in the HTML with scripts off, one arc per session in the data file', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const route of ['/', '/cv/', '/in/']) {
    await page.goto(baseURL + route);
    await expect(page.locator('figure[data-block=mark] svg.mark')).toHaveCount(1);
    await expect(page.locator('figure[data-block=mark] svg.mark .seg')).toHaveCount(total);
  }
  await ctx.close();
});

test('[REQ-056] the table has one row per arc and each row matches the data', async ({ page }) => {
  await page.goto('/');
  const rows = page.locator('details [data-mark-table], details .scroll tbody tr');
  await expect(page.locator('details tbody tr')).toHaveCount(total);
  const segs = await page.$$eval('figure[data-block=mark] .seg', (els) => els.map((e) => ({ ...(e as HTMLElement).dataset })));
  const tableRows = await page.$$eval('details tbody tr', (trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent)));
  expect(tableRows.length).toBe(segs.length);
  tableRows.forEach((cells, i) => {
    const rec = lookup(cells[0]!, cells[1]!);
    expect(rec, `${cells[0]} ${cells[1]}`).toBeTruthy();
    expect(cells[3]).toBe(String(rec.minutes ?? 1));
    expect(cells[4]).toContain(rec.merged_by_owner ? 'merged by me' : 'not merged by me');
    expect(segs[i].session).toBe(cells[1]);
  });
  void rows;
});

test('[REQ-057] the mark has an accessible name with the counts, is one tab stop, and the arrow keys move arc by arc', async ({ page }) => {
  await page.goto('/');
  const svg = page.locator('figure[data-block=mark] svg.mark');
  const name = await svg.getAttribute('aria-label');
  expect(name).toContain(`${total} agent sessions`);
  expect(name).toContain(`${merged} merged by the owner`);
  expect(name).toContain(`${nv} checks reported as not verified`);
  await expect(page.locator('[data-readout]')).toHaveAttribute('aria-live', 'polite');
  // one tab stop
  let stops = 0;
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    if (await svg.evaluate((e) => e === document.activeElement)) stops++;
  }
  expect(stops).toBe(1);
  await svg.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  const third = page.locator('figure[data-block=mark] .seg').nth(2);
  const d = await third.evaluate((e) => ({ ...(e as unknown as HTMLElement).dataset }));
  const rec = lookup(d.projectName!, d.session!);
  const readout = await page.locator('[data-readout]').innerText();
  expect(readout).toContain(d.projectName!);
  expect(readout).toContain(`session ${rec.session}`);
  expect(readout).toContain(`${rec.model} / ${rec.effort}`);
  expect(readout).toContain(`${rec.minutes ?? 1} minutes`);
  expect(readout).toContain(rec.merged_by_owner ? `#${rec.pr_number} merged by me` : 'not merged by me');
  await expect(third).toHaveClass(/\bon\b/);
  await page.keyboard.press('End');
  expect(await page.locator('.seg.on').count()).toBe(1);
  expect(await page.locator('.seg').nth(total - 1).getAttribute('class')).toContain('on');
  await page.keyboard.press('Home');
  expect(await page.locator('.seg').nth(0).getAttribute('class')).toContain('on');
  await page.keyboard.press('Escape');
  expect(await page.locator('.seg.on').count()).toBe(0);
  await expect(page.locator('[data-readout]')).toContainText('The proof mark');
});

test('[REQ-057] the readout links to the pull request of the selected arc', async ({ page }) => {
  await page.goto('/');
  await page.locator('figure[data-block=mark] svg.mark').focus();
  await page.keyboard.press('ArrowRight');
  const href = await page.locator('[data-readout] a').getAttribute('href');
  expect(href).toMatch(/^https:\/\/github\.com\/ampaduchris\/[\w.-]+\/pull\/\d+$/);
});

test('[REQ-058] with reduced motion nothing moves and no pause button shows', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(baseURL + '/');
  const names = await page.$$eval('figure[data-block=mark] .ring', (els) => els.map((e) => getComputedStyle(e).animationName));
  expect(names.length).toBeGreaterThan(0);
  expect(new Set(names)).toEqual(new Set(['none']));
  await expect(page.locator('[data-motion]')).toBeHidden();
  await ctx.close();
});

test('[REQ-058] otherwise the rings drift and the button stops and restarts them', async ({ page }) => {
  await page.goto('/');
  const state = () => page.$$eval('figure[data-block=mark] .ring:not(.orbit)', (els) => els.map((e) => getComputedStyle(e).animationPlayState));
  expect(new Set(await state())).toEqual(new Set(['running']));
  const btn = page.locator('[data-motion]');
  await expect(btn).toBeVisible();
  await btn.click();
  await page.mouse.move(0, 0);
  expect(new Set(await state())).toEqual(new Set(['paused']));
  await expect(btn).toHaveText('Resume motion');
  await btn.click();
  await page.mouse.move(0, 0);
  expect(new Set(await state())).toEqual(new Set(['running']));
  const stored = await page.evaluate(() => ({ local: Object.keys(localStorage), session: sessionStorage.length }));
  expect(stored).toEqual({ local: [], session: 0 }); // the choice is not stored
});

test('[REQ-058] the drift stops while the mark is hovered', async ({ page }) => {
  await page.goto('/');
  await page.locator('figure[data-block=mark] svg.mark').hover();
  const s = await page.$$eval('figure[data-block=mark] .ring:not(.orbit)', (els) => els.map((e) => getComputedStyle(e).animationPlayState));
  expect(new Set(s)).toEqual(new Set(['paused']));
});

// ---- REQ-005 (the reading block) and REQ-059 (claims) ----

const reading = (page: any) => page.locator('[data-block=reading]');

test('[REQ-005] [REQ-053] Method has "How to read the mark": the mark with one arc per session, seven legend rows and the table', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(baseURL + '/method/');
  await expect(reading(page).locator('h2')).toHaveText('How to read the mark');
  await expect(reading(page).locator('svg.mark')).toHaveCount(1);
  await expect(reading(page).locator('svg.mark .seg')).toHaveCount(total);
  await expect(reading(page).locator('dl dt')).toHaveCount(7);
  await expect(reading(page).locator('dl dd')).toHaveCount(7);
  const names = await reading(page).locator('dd > b:first-child').allInnerTexts();
  expect(names).toEqual(['A ring', 'An arc', 'Thickness', 'Solid', 'A dot', 'Outer nodes', 'The centre']);
  await ctx.close();
});

test('[REQ-056] Method holds the table of the mark, one row per arc, inside a details element', async ({ page }) => {
  await page.goto('/method/');
  await expect(page.locator('[data-block=reading] details tbody tr')).toHaveCount(total);
  const cells = await page.$$eval('[data-block=reading] details tbody tr', (trs) => trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent)));
  const sessions = await page.$$eval('[data-block=reading] .seg', (els) => els.map((e) => (e as unknown as HTMLElement).dataset.session));
  expect(cells.map((c) => c[1])).toEqual(sessions);
});

test('[REQ-057] on Method the mark has the counts in its name, the readout follows the arrow keys and Escape clears it', async ({ page }) => {
  await page.goto('/method/');
  const svg = reading(page).locator('svg.mark');
  const name = await svg.getAttribute('aria-label');
  expect(name).toContain(`${total} agent sessions`);
  expect(name).toContain(`${merged} merged by the owner`);
  await svg.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  const d = await reading(page).locator('.seg').nth(2).evaluate((e: Element) => ({ ...(e as HTMLElement).dataset }));
  const readout = await reading(page).locator('[data-readout]').innerText();
  expect(readout).toContain(`session ${d.session}`);
  expect(readout).toContain(`${d.minutes} minutes`);
  await page.keyboard.press('Escape');
  await expect(reading(page).locator('[data-readout]')).toContainText('Try it');
});

test('[REQ-058] on Method the pause button stops and restarts the rings', async ({ page }) => {
  await page.goto('/method/');
  const state = () => page.$$eval('[data-block=reading] .ring:not(.orbit)', (els) => els.map((e) => getComputedStyle(e).animationPlayState));
  expect(new Set(await state())).toEqual(new Set(['running']));
  await reading(page).locator('[data-motion]').click();
  await page.mouse.move(0, 0);
  expect(new Set(await state())).toEqual(new Set(['paused']));
});

const CLAIMS = [
  { name: 'sessions', stat: 'sessions', text: 'direct coding agents' },
  { name: 'agent', stat: 'agent_commits', text: 'do not write the code by hand' },
  { name: 'evidence', stat: 'not_verified', text: 'what evidence would prove the work wrong' },
  { name: 'merged', stat: 'prs_merged', text: 'approve every change myself' },
];

test('[REQ-059] with scripts off the four claims are links to statistics that exist, in order', async ({ browser, baseURL }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  for (const route of ['/', '/cv/', '/in/']) {
    await page.goto(baseURL + route);
    const claims = page.locator('[data-block=intro] a.probe');
    await expect(claims).toHaveCount(4);
    expect(await claims.allInnerTexts()).toEqual(CLAIMS.map((c) => c.text));
    expect(await claims.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(CLAIMS.map((c) => `#stat-${c.stat}`));
    for (const c of CLAIMS) await expect(page.locator(`[data-block=method-summary] #stat-${c.stat}[data-stat]`)).toHaveCount(1);
    // No text appears only on hover: the hint under the introduction is in the HTML.
    await expect(page.locator('.hint')).toContainText('Each underlined phrase is a claim');
  }
  await ctx.close();
});

// The fixture build draws a synthetic mark in which the merged set, the not-verified set and the open set all differ (tests/fixtures/mark-mixed.json).
const FIXTURE = 'http://127.0.0.1:4322';
const fx = JSON.parse(readFileSync('tests/fixtures/mark-mixed.json', 'utf8'));
const fxSessions: any[] = fx.projects.flatMap((p: any) => p.sessions);
const expectedOn: Record<string, string[]> = {
  sessions: fxSessions.map((s) => s.session),
  agent: fxSessions.map((s) => s.session),
  evidence: fxSessions.filter((s) => s.not_verified > 0).map((s) => s.session),
  merged: fxSessions.filter((s) => s.merged_by_owner).map((s) => s.session),
};
const onSessions = (page: any) => page.$$eval('figure[data-block=mark] .seg.on', (els: Element[]) => els.map((e) => (e as HTMLElement).dataset.session).sort());

for (const c of CLAIMS) {
  test(`[REQ-059] pointing at "${c.text}" lights exactly the arcs that support it and the readout repeats its statistic`, async ({ page }) => {
    await page.goto(`${FIXTURE}/`);
    const svg = page.locator('figure[data-block=mark] svg.mark');
    await page.locator(`a.probe[data-probe=${c.name}]`).hover();
    expect(await onSessions(page)).toEqual([...expectedOn[c.name]].sort());
    await expect(svg).toHaveAttribute('data-hl', c.name);
    expect(await svg.evaluate((e) => e.classList.contains('tint'))).toBe(c.name === 'agent');
    if (c.name === 'merged') {
      await expect(page.locator('figure[data-block=mark] .seg.open.on')).toHaveCount(0); // no dashed arc
      await expect(page.locator('figure[data-block=mark] .seg.merged.on')).toHaveCount(expectedOn.merged.length);
    }
    const tile = page.locator(`#stat-${c.stat}`);
    const readout = await page.locator('[data-readout]').innerText();
    expect(readout).toContain('Claim to evidence');
    expect(readout).toContain((await tile.locator('.v').innerText()).trim());
    expect(readout).toContain((await tile.locator('.l').innerText()).trim());
    expect(readout).toContain((await tile.locator('[data-n]').innerText()).trim());
    await page.mouse.move(0, 0);
    await expect(page.locator('figure[data-block=mark] .seg.on')).toHaveCount(0);
    await expect(page.locator('[data-readout]')).toContainText('The proof mark');
  });
}

test('[REQ-059] focusing a claim with the keyboard lights its arcs and leaving it clears them', async ({ page }) => {
  await page.goto(`${FIXTURE}/`);
  await page.locator('a.probe[data-probe=evidence]').focus();
  expect(await onSessions(page)).toEqual([...expectedOn.evidence].sort());
  await page.locator('a.probe[data-probe=evidence]').blur();
  await expect(page.locator('figure[data-block=mark] .seg.on')).toHaveCount(0);
});

test('[REQ-059] on the real data hovering the fourth claim lights every merged arc and no dashed arc', async ({ page }) => {
  await page.goto('/');
  await page.locator('a.probe[data-probe=merged]').hover();
  await expect(page.locator('figure[data-block=mark] .seg.merged.on')).toHaveCount(merged);
  await expect(page.locator('figure[data-block=mark] .seg.open.on')).toHaveCount(0);
});
