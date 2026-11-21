// REQ-035: with analytics on, the only third-party origin named in the built files is the analytics endpoint.
// Anchors to other sites are exempt. The counting script is served from the site's own origin.

export interface Scan { origins: string[] }

const ATTR = /<(script|link|img|source|iframe|video|audio)\b[^>]*?\b(?:src|href|data-goatcounter)="([^"]+)"/gi;
const CSS_URL = /url\(\s*["']?([^)"']+)["']?\s*\)|@import\s+["']([^"']+)["']/gi;

function originOf(ref: string): string | null {
  if (!/^(https?:)?\/\//i.test(ref)) return null;
  try {
    return new URL(ref.startsWith('//') ? `https:${ref}` : ref).origin;
  } catch {
    return ref;
  }
}

/** Third-party origins named by resources (not anchors) in a page or style sheet, given the site's own origin. */
export function resourceOrigins(text: string, own: string, canonicalOk = true): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(ATTR)) {
    const tag = m[0];
    if (canonicalOk && /rel="canonical"/.test(tag)) continue;
    const o = originOf(m[2]);
    if (o && o !== own) found.add(o);
  }
  for (const m of text.matchAll(CSS_URL)) {
    const o = originOf(m[1] ?? m[2]);
    if (o && o !== own) found.add(o);
  }
  return [...found].sort();
}

/** Returns the problems: origins other than the allowed endpoint's. Empty means REQ-035 holds. */
export function originProblems(files: Record<string, string>, own: string, endpoint: string | null): string[] {
  const allowed = endpoint ? new URL(endpoint).origin : null;
  const problems: string[] = [];
  for (const [name, text] of Object.entries(files)) {
    for (const o of resourceOrigins(text, own)) if (o !== allowed) problems.push(`${name}: names ${o}`);
  }
  return problems;
}
