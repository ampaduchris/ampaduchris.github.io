import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

const method = JSON.parse(readFileSync('src/data/method.json', 'utf8'));
const blocks = (page: Page) => page.$$eval('[data-block]', (els) => els.map((e) => e.getAttribute('data-block')));
const valueOf = (s: any) => (s.value === null ? null : Array.isArray(s.value) ? s.value : String(s.value));

test('[REQ-005] Method shows its blocks in the specified order', async ({ page }) => {
  await page.goto('/method/');
  // The reading block and its mark are a later session (docs/phase.txt).
  expect(await blocks(page)).toEqual(['header', 'loop', 'approval', 'modes', 'numbers', 'computed', 'recent', 'limits', 'footer']);
});

test('[REQ-005] the loop has six steps and the limits name the account and the date', async ({ page }) => {
  await page.goto('/method/');
  await expect(page.locator('[data-steps] li')).toHaveCount(6);
  await expect(page.locator('[data-block=recent] [data-pr]')).toHaveCount(Math.min(5, method.counts.pull_requests));
  const limits = await page.locator('[data-block=limits]').innerText();
  expect(limits).toContain('one GitHub account');
  expect(limits).toContain('15 Nov 2026');
});

test('[REQ-031] every statistic on Method shows the value and sample size the data file holds, and every id is shown', async ({ page }) => {
  await page.goto('/method/');
  const shown = await page.$$eval('[data-stat]', (els) => els.map((e) => e.getAttribute('data-src')));
  expect(shown.sort()).toEqual(method.stats.map((s: any) => `method.json#${s.id}`).sort());
  for (const s of method.stats) {
    const tile = page.locator(`[data-src="method.json#${s.id}"]`);
    const v = valueOf(s);
    if (Array.isArray(v)) for (const m of v) await expect(tile).toContainText(`${m.name} · ${m.sessions}`);
    else if (v !== null) await expect(tile.locator('.v')).toHaveText(v);
    else await expect(tile).toContainText('Shown from 20 pull requests');
    await expect(tile.locator('[data-n]')).toContainText(`n = ${s.n}`);
  }
});

test('[REQ-032] Method shows when the numbers were generated, the cut-off and the counts they rest on', async ({ page }) => {
  await page.goto('/method/');
  const note = page.locator('[data-block=computed]');
  await expect(note.locator('time').first()).toHaveAttribute('datetime', method.generated_at.slice(0, 10));
  await expect(note.locator('time').nth(1)).toHaveAttribute('datetime', method.cutoff);
  await expect(note).toContainText(`${method.counts.build_log_rows} build-log rows`);
  await expect(note).toContainText(`${method.counts.pull_requests} pull requests`);
});

for (const route of ['/', '/method/']) {
  test(`[REQ-023] every statistic on ${route} has its sample size inside it and in its accessible name`, async ({ page }) => {
    await page.goto(route);
    const stats = page.locator('[data-stat]');
    expect(await stats.count()).toBeGreaterThan(0);
    for (let i = 0; i < (await stats.count()); i++) {
      await expect(stats.nth(i).locator('[data-n]')).toHaveCount(1);
      expect(await stats.nth(i).getAttribute('aria-label')).toContain('n = ');
    }
  });
}

test('[REQ-024] a proportion is written "k of n"', async ({ page }) => {
  await page.goto('/method/');
  for (const id of ['agent_commits', 'prs_merged', 'prs_commented', 'upstream_merged'])
    await expect(page.locator(`[data-src="method.json#${id}"] .v`)).toHaveText(/^\d+ of \d+$/);
});

test('[REQ-025] below 20 pull requests the median is not shown, and at 20 it is', async ({ page }) => {
  await page.goto('/method/');
  const tile = page.locator('[data-src="method.json#hours_to_merge"]');
  const merged = method.stats.find((s: any) => s.id === 'hours_to_merge').n;
  expect(merged).toBeLessThan(20);
  await expect(tile).toContainText(`Shown from 20 pull requests. Today: n = ${merged}.`);
  await expect(tile.locator('.v')).toHaveCount(0);
  await page.goto('http://127.0.0.1:4323/method/');
  const shown = page.locator('[data-src="method.json#hours_to_merge"]');
  await expect(shown.locator('.v')).toHaveText('0.3');
  await expect(shown.locator('[data-n]')).toHaveText('n = 20');
});

test('[REQ-001] Home summarises four statistics from the data file and links to Method', async ({ page }) => {
  await page.goto('/');
  const ids = await page.$$eval('[data-block=method-summary] [data-stat]', (els) => els.map((e) => e.getAttribute('data-src')));
  expect(ids).toEqual(['sessions', 'agent_commits', 'not_verified', 'prs_merged'].map((i) => `method.json#${i}`));
  await expect(page.locator('[data-block=method-summary]').getByRole('link', { name: 'How the work is checked' })).toHaveAttribute('href', '/method/');
});

test('[REQ-021] an own pull request row shows its state, who merged it and how long after it was ready', async ({ page }) => {
  await page.goto('/method/');
  for (const [i, r] of method.recent.entries()) {
    const row = page.locator('[data-block=recent] [data-pr]').nth(i);
    await expect(row).toHaveAttribute('href', r.url);
    await expect(row).toContainText(`${r.repo} #${r.number}`);
    await expect(row).toContainText(r.state === 'merged' ? `Merged by me after ${r.hours_to_merge.toFixed(1)} hours` : r.state === 'open' ? 'Open' : 'Closed');
  }
});
