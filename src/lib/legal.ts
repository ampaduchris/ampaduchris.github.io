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

/** Fails the build while a legal file is missing or pending (REQ-007). */
export function assertLegal(files: Record<string, string | undefined>): void {
  const problems = legalProblems(files);
  if (problems.length) throw new Error(`[legal] ${problems.join('; ')}`);
}
