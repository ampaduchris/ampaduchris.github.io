import { expect, test } from '@playwright/test';

// The fixture build uses tests/fixtures/upstream-seven.json (synthetic data); see npm run build:fixture.
const FIXTURE = 'http://127.0.0.1:4322';

test('[REQ-004] seven fixture pull requests give five rows, newest first', async ({ page }) => {
  await page.goto(`${FIXTURE}/`);
  const rows = page.locator('[data-block=upstream] [data-pr]');
  await expect(rows).toHaveCount(5);
  const dates = await rows.locator('time').evaluateAll((ts) => ts.map((t) => t.getAttribute('datetime')));
  expect(dates).toEqual([...dates].sort().reverse());
  expect(dates[0]).toBe('2026-10-28');
});

test('[REQ-021] an evidence row shows the repository, number, title, state, date and links to the pull request', async ({ page }) => {
  await page.goto(`${FIXTURE}/`);
  const row = page.locator('[data-pr]').first();
  await expect(row).toHaveAttribute('href', 'https://github.com/example-org/example-repo/pull/106');
  await expect(row).toContainText('example-org/example-repo #106');
  await expect(row).toContainText('Fixture pull request G');
  await expect(row).toContainText('Merged by a maintainer');
  await expect(row.locator('time')).toHaveText('28 Oct 2026');
});
