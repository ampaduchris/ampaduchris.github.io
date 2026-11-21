import { parse } from 'yaml';
import { PORTFOLIO_FIELDS, validateProjects, type Project } from './schema';

export interface Remote {
  portfolio_yml: string | null; // text of portfolio.yml on the default branch, or null when the file is missing
  latest_release: string | null;
}

/** One message per difference. Empty means the entry is current (REQ-018). */
export function compareEntry(entry: Project, remote: Remote): string[] {
  const id = entry.slug;
  if (remote.portfolio_yml === null) return [`${id}: portfolio.yml is missing from ${entry.repo}`];
  let doc: unknown;
  try {
    doc = parse(remote.portfolio_yml);
  } catch (e) {
    return [`${id}: portfolio.yml does not parse (${(e as Error).message.split('\n')[0]})`];
  }
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) return [`${id}: portfolio.yml is not a mapping`];
  const remotePf = doc as Record<string, unknown>;
  const lines: string[] = [];
  // schema: the nine fields, no more, no fewer
  for (const f of PORTFOLIO_FIELDS) if (!(f in remotePf)) lines.push(`${id}: portfolio.yml fails the schema: missing field "${f}"`);
  for (const k of Object.keys(remotePf)) if (!(PORTFOLIO_FIELDS as readonly string[]).includes(k)) lines.push(`${id}: portfolio.yml fails the schema: unknown field "${k}"`);
  if (lines.length) return lines;
  const probe = validateProjects([{ ...entry, portfolio: remotePf }]).filter((m) => m.startsWith(`${id}: portfolio`));
  for (const m of probe) lines.push(`${id}: portfolio.yml fails the schema: ${m.replace(`${id}: `, '')}`);
  if (lines.length) return lines;
  for (const f of PORTFOLIO_FIELDS) {
    const a = JSON.stringify(entry.portfolio[f]);
    const b = JSON.stringify(remotePf[f]);
    if (a !== b) lines.push(`${id}: portfolio.${f} differs: data file ${a}, repository ${b}`);
  }
  if (remote.latest_release !== entry.portfolio.release) lines.push(`${id}: release differs: data file ${JSON.stringify(entry.portfolio.release)}, latest release tag ${JSON.stringify(remote.latest_release)}`);
  return lines;
}
