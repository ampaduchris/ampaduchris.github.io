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
