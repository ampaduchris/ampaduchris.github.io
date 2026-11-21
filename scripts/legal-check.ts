// Exits 1 while imprint.md or privacy.md is missing or holds the pending marker (REQ-007). Run before publishing.
import { existsSync, readFileSync } from 'node:fs';
import { legalProblems } from '../src/lib/legal';

const read = (name: string) => (existsSync(`src/content/legal/${name}`) ? readFileSync(`src/content/legal/${name}`, 'utf8') : undefined);
const problems = legalProblems({ imprint: read('imprint.md'), privacy: read('privacy.md') });
for (const p of problems) console.error(`legal: ${p}`);
process.exit(problems.length ? 1 : 0);
