// Prints the size of each page and of its fonts and scripts (REQ-048). Reported, not a gate.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const size = (f) => statSync(join(dist, f)).size;
const walk = (d) => readdirSync(join(dist, d)).flatMap((f) => (statSync(join(dist, d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk('');
const fonts = files.filter((f) => f.endsWith('.woff2')).reduce((a, f) => a + size(f), 0);
const scripts = files.filter((f) => f.endsWith('.js')).reduce((a, f) => a + size(f), 0);
const css = files.filter((f) => f.endsWith('.css')).reduce((a, f) => a + size(f), 0);
for (const page of files.filter((f) => f.endsWith('.html'))) {
  const html = size(page);
  console.log(`${page}: html ${html} B, css ${css} B, fonts ${fonts} B, scripts ${scripts} B, total ${html + css + fonts + scripts} B (before compression)`);
}
