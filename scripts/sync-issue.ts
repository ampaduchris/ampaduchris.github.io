// Runs the sync check and, on exit 1, opens one issue or adds a comment to the open one (REQ-019).
// It never pushes a commit. Needs the gh CLI and GH_TOKEN with issues: write. Used by .github/workflows/sync.yml.
import { execFileSync, spawnSync } from 'node:child_process';
import { decideIssueAction } from '../src/lib/issue';

const run = spawnSync('npx', ['tsx', 'scripts/sync-check.ts'], { encoding: 'utf8' });
process.stdout.write(run.stdout);
process.stderr.write(run.stderr);
if (run.status === 0) process.exit(0);

const body = `The weekly sync check found differences between \`src/data/projects.yml\` and the project repositories.\n\n\`\`\`\n${run.stdout.trim()}\n\`\`\`\n\nRun: ${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const gh = (args: string[]) => execFileSync('gh', args, { encoding: 'utf8' });
const open = JSON.parse(gh(['issue', 'list', '--state', 'open', '--json', 'number,title', '--limit', '100'])) as { number: number; title: string }[];
const action = decideIssueAction(open);
if (action.kind === 'comment') gh(['issue', 'comment', String(action.number), '--body', body]);
else gh(['issue', 'create', '--title', action.title, '--body', body]);
process.exit(1);
