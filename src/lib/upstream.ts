export interface UpstreamPr {
  repo: string;      // owner/name
  number: number;
  title: string;
  url: string;
  merged_at: string; // ISO date
}

/** Newest first, at most five (REQ-004). */
export function selectUpstream(prs: UpstreamPr[]): UpstreamPr[] {
  return [...prs].sort((a, b) => (a.merged_at < b.merged_at ? 1 : a.merged_at > b.merged_at ? -1 : 0)).slice(0, 5);
}
