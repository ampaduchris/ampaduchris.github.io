// Opens an issue with the given title and body file, or comments on the open issue with that title.
// Usage: tsx scripts/issue-from-file.ts "<title>" <file>. Needs the gh CLI and GH_TOKEN with issues: write.
import { execFileSync } from 'node:child_process';
import { decideIssueAction } from '../src/lib/issue';

const [title, file] = process.argv.slice(2);
if (!title || !file) throw new Error('usage: issue-from-file.ts "<title>" <file>');
const gh = (args: string[]) => execFileSync('gh', args, { encoding: 'utf8' });
const open = JSON.parse(gh(['issue', 'list', '--state', 'open', '--json', 'number,title', '--limit', '100'])) as { number: number; title: string }[];
const action = decideIssueAction(open, title);
if (action.kind === 'comment') gh(['issue', 'comment', String(action.number), '--body-file', file]);
else gh(['issue', 'create', '--title', action.title, '--body-file', file]);
