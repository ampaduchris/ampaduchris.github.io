// Scans a built site for third-party origins (REQ-035). Usage: tsx scripts/scan-dist.ts dist
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadSite } from '../src/lib/data';
import { originProblems } from '../src/lib/origins';

const dir = process.argv[2] ?? 'dist';
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files: Record<string, string> = {};
for (const f of walk(dir)) if (/\.(html|css|js|xml)$/.test(f)) files[f] = readFileSync(f, 'utf8');
const site = loadSite();
const problems = originProblems(files, new URL(site.url).origin, site.analytics?.endpoint ?? null);
for (const p of problems) console.error(p);
console.log(`${Object.keys(files).length} files scanned, ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
