// The claims checker (REQ-082). Usage: tsx scripts/check-claims.ts [notes-dir] [evidence-file]
// Exits 1, naming the note and the sentence, when a claim has no evidence row, when a marker names a missing row, or when a note has no marker.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkAll, loadSources, NOTES_DIR } from '../src/lib/notes';
import { parseEvidence } from '../src/lib/evidence';
import { parseNote } from '../src/lib/claims';

const dir = resolve(process.argv[2] ?? NOTES_DIR);
const file = resolve(process.argv[3] ?? 'src/data/evidence.yml');
const evidence = parseEvidence(readFileSync(file, 'utf8'));
const sources = loadSources(dir);
// Session ids are not checked here (they need mark.json and the project data); the build checks them. The checker takes each note's own list.
const known = sources.flatMap((s) => [...((parseNote(s.raw).data.sessions as unknown[]) ?? []), ...(((parseNote(s.raw).data.review as unknown[]) ?? []))].map(String));
const { notes, errors, checked } = checkAll(sources, evidence, known);
const claims = notes.reduce((n, x) => n + x.claims, 0);
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`FAIL: ${errors.length} problem(s) in ${checked} note(s)`);
  process.exit(1);
}
console.log(`ok: ${checked} note${checked === 1 ? '' : 's'}, ${claims} claims, every claim linked to an evidence row`);
