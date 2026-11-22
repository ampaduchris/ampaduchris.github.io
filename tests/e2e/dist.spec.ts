import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk('dist');
const html = files.filter((f) => f.endsWith('.html'));

test('[REQ-013] the sitemap lists the indexable routes and not the 404 page', () => {
  const xml = readFileSync('dist/sitemap-0.xml', 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const notes = readdirSync('src/content/notes').filter((f) => f.endsWith('.mdx')).map((f) => `https://ampaduchris.github.io/notes/${f.replace(/\.mdx$/, '')}/`);
  expect([...locs].sort()).toEqual(['https://ampaduchris.github.io/', 'https://ampaduchris.github.io/contact/', 'https://ampaduchris.github.io/legal/', 'https://ampaduchris.github.io/method/', 'https://ampaduchris.github.io/notes/', ...notes].sort());
});

test('[REQ-037] fonts are WOFF2 files from the site and each family has its licence', () => {
  const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
  const families = [...new Set([...css.matchAll(/@font-face\s*\{[^}]*?font-family:\s*"?([^";}]+)"?/g)].map((m) => m[1].trim()))];
  expect(families.sort()).toEqual(['Inter', 'JetBrains Mono']);
  for (const f of families) {
    const licence = `public/fonts/licences/${f.toLowerCase().replace(/ /g, '-')}-OFL.txt`;
    expect(existsSync(licence), licence).toBe(true);
    expect(readFileSync(licence, 'utf8')).toContain('SIL Open Font License');
  }
  for (const m of css.matchAll(/url\(([^)]+\.woff2)\)/g)) expect(m[1].startsWith('/fonts/')).toBe(true);
  expect(files.some((f) => /\.(ttf|otf|woff)$/.test(f))).toBe(false);
});

test('[REQ-040] the only scripts the site ships are the theme script, the loop module and the mark module, loaded only where they are used', () => {
  expect(files.filter((f) => f.endsWith('.js')).map((f) => f.replace(/^dist\//, '')).sort()).toEqual(['loop.js', 'mark.js', 'theme.js']);
  for (const f of html) {
    const srcs = [...readFileSync(f, 'utf8').matchAll(/<script[^>]*>/g)].map((m) => m[0]);
    for (const s of srcs) expect(s).toMatch(/src="\/(theme|loop|mark)\.js"/);
    expect(srcs.some((s) => s.includes('loop.js')), f).toBe(f.endsWith('method/index.html'));
    expect(srcs.some((s) => s.includes('mark.js')), f).toBe(['index.html', 'cv/index.html', 'in/index.html', 'method/index.html'].some((n) => f === `dist/${n}`));
  }
});

test('[REQ-050] no social image tag, no frame and no external resource', () => {
  for (const f of html) {
    const t = readFileSync(f, 'utf8');
    expect(t, f).not.toMatch(/og:image|twitter:image|<iframe|<img[^>]*src="https?:/i);
    // The canonical link names the site's own address; it is not a request.
    const refs = [...t.matchAll(/<(?:script|link)(?![^>]*rel="canonical")[^>]*(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]);
    expect(refs, f).toEqual([]);
  }
  const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
  expect(css).not.toMatch(/url\(\s*["']?https?:|@import/);
});

test('[REQ-038] the browser tests cannot reach the network, in the default context and in one a test creates', async ({ page, browser, baseURL }) => {
  await expect(page.goto('https://example.com/', { timeout: 10_000 })).rejects.toThrow();
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const other = await ctx.newPage();
  await expect(other.goto('https://example.com/', { timeout: 10_000 })).rejects.toThrow();
  const local = await ctx.newPage(); // the local server is still reachable
  await local.goto(baseURL + '/');
  await expect(local.locator('h1')).toHaveCount(1);
  await ctx.close();
});

test('[REQ-086] the sitemap lists /notes/ and each note when notes exist, and nothing under /notes/ when none does', () => {
  const locs = (dir: string) => [...readFileSync(`${dir}/sitemap-0.xml`, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const real = readdirSync('src/content/notes').filter((f) => f.endsWith('.mdx')).map((f) => `https://ampaduchris.github.io/notes/${f.replace(/\.mdx$/, '')}/`);
  expect(locs('dist').filter((l) => l.includes('/notes')).sort()).toEqual(['https://ampaduchris.github.io/notes/', ...real].sort());
  expect(locs('dist-median').filter((l) => l.includes('/notes'))).toEqual([]);
  expect(locs('dist-fixture').filter((l) => l.includes('/notes')).sort()).toEqual([
    'https://ampaduchris.github.io/notes/', 'https://ampaduchris.github.io/notes/essay-a/',
    'https://ampaduchris.github.io/notes/postmortem-a/', 'https://ampaduchris.github.io/notes/postmortem-b/']);
});
