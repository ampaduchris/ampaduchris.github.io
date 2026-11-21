export const PENDING = 'OWNER-DECISION-PENDING';

/** Names the legal files that are missing or still hold the pending marker (REQ-007). */
export function legalProblems(files: Record<string, string | undefined>): string[] {
  const problems: string[] = [];
  for (const name of ['imprint', 'privacy']) {
    const text = files[name];
    if (text === undefined) problems.push(`${name}.md is missing`);
    else if (text.includes(PENDING)) problems.push(`${name}.md still contains ${PENDING}`);
  }
  return problems;
}
