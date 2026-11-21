export const STALE_TITLE = 'Project data is stale';

export interface OpenIssue { number: number; title: string }

export type IssueAction = { kind: 'create'; title: string } | { kind: 'comment'; number: number };

/** One issue titled "Project data is stale" at most: comment if one is open, else create (REQ-019). */
export function decideIssueAction(open: OpenIssue[], title: string = STALE_TITLE): IssueAction {
  const existing = open.find((i) => i.title === title);
  return existing ? { kind: 'comment', number: existing.number } : { kind: 'create', title };
}
