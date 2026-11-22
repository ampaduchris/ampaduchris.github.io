// Takes the two README screenshots of Home from the built site (wide and narrow).
// Usage: npm run build && npm run screenshots [-- <output dir>]   (default docs/screenshots)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const out = process.argv[2] ?? 'docs/screenshots';
mkdirSync(out, { recursive: true });
const server = spawn('node', ['scripts/serve.mjs', 'dist', '4321'], { stdio: 'ignore' });
const base = process.env.SITE_URL ?? 'http://127.0.0.1:4321';
for (let i = 0; i < 50; i++) {
  try { if ((await fetch(base)).ok) break; } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 200));
}
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'chrome' });
try {
  for (const [name, width, height] of [['home-wide', 1280, 900], ['home-narrow', 375, 812]] as const) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: 'light', reducedMotion: 'reduce' });
    await page.goto(base);
    await page.screenshot({ path: `${out}/${name}.png` });
    await page.close();
    console.log(`${out}/${name}.png`);
  }
} finally {
  await browser.close();
  server.kill();
}
