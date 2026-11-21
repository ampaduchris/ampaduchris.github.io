import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ROUTES = ['/', '/contact/', '/legal/', '/cv/', '/in/', '/no-such-page/'];
const WIDTHS = { narrow: 375, wide: 1280 } as const;

for (const route of ROUTES) {
  for (const [label, width] of Object.entries(WIDTHS)) {
    for (const scheme of ['light', 'dark'] as const) {
      test(`[REQ-039] axe finds no serious or critical issue on ${route}, ${label}, ${scheme}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route);
        if (scheme === 'dark') await page.locator('[data-theme-toggle]').click();
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
        const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }
  }
}
