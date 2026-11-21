import { expect, test } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk('dist');
const html = files.filter((f) => f.endsWith('.html'));

test('[REQ-013] the sitemap lists the indexable routes and not the 404 page', () => {
  const xml = readFileSync('dist/sitemap-0.xml', 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect(locs).toEqual(['https://ampaduchris.github.io/', 'https://ampaduchris.github.io/contact/', 'https://ampaduchris.github.io/legal/', 'https://ampaduchris.github.io/method/']);
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

test('[REQ-040] the only script the site ships is the theme script', () => {
  expect(files.filter((f) => f.endsWith('.js')).map((f) => f.replace(/^dist\//, ''))).toEqual(['theme.js']);
  for (const f of html) {
    const srcs = [...readFileSync(f, 'utf8').matchAll(/<script[^>]*>/g)].map((m) => m[0]);
    for (const s of srcs) expect(s).toContain('src="/theme.js"');
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
