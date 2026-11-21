// The project data file schema (spec 5.1, 5.2). Pure functions: no file or network access.

export const PORTFOLIO_FIELDS = [
  'name', 'pitch', 'stack', 'tests', 'release', 'released_on', 'demo_url', 'repo_url', 'example_pr_url',
] as const;
const HEADLINE_FIELDS = ['value', 'label', 'n', 'kind', 'source_url'] as const;
const ENTRY_FIELDS = ['slug', 'repo', 'order', 'portfolio', 'headline', 'sessions', 'models'] as const;

export interface Model { name: string; sessions: number }
export interface Project {
  slug: string;
  repo: string;
  order: number;
  portfolio: {
    name: string; pitch: string; stack: string[]; tests: number; release: string;
    released_on: string; demo_url: string; repo_url: string; example_pr_url: string;
  };
  headline: { value: string; label: string; n: number | null; kind: 'tests' | 'measured'; source_url: string };
  sessions: number;
  models: Model[];
}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

function checkKeys(where: string, obj: Rec, allowed: readonly string[], errors: string[]): void {
  for (const f of allowed) if (!(f in obj)) errors.push(`${where}: missing field "${f}"`);
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) errors.push(`${where}: unknown field "${k}"`);
}

/** Returns one message per problem, each naming the entry and the field. Empty means valid. */
export function validateProjects(data: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(data)) return ['projects.yml: the file must be a list'];
  const slugs = new Set<string>();
  const orders = new Set<number>();
  data.forEach((raw, i) => {
    if (!isRec(raw)) { errors.push(`entry ${i + 1}: must be a mapping`); return; }
    const id = typeof raw.slug === 'string' && raw.slug ? raw.slug : `entry ${i + 1}`;
    checkKeys(id, raw, ENTRY_FIELDS, errors);
    if ('slug' in raw && !(isStr(raw.slug) && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(raw.slug))) errors.push(`${id}: slug must be lower case with hyphens`);
    if ('repo' in raw && !(isStr(raw.repo) && /^[\w.-]+\/[\w.-]+$/.test(raw.repo))) errors.push(`${id}: repo must be owner/name`);
    if ('order' in raw && !isInt(raw.order)) errors.push(`${id}: order must be an integer`);
    if ('sessions' in raw && !(isInt(raw.sessions) && raw.sessions >= 0)) errors.push(`${id}: sessions must be a whole number`);
    if ('models' in raw) {
      if (!Array.isArray(raw.models)) errors.push(`${id}: models must be a list`);
      else raw.models.forEach((m, j) => {
        if (!isRec(m)) { errors.push(`${id}: models[${j}] must be a mapping`); return; }
        checkKeys(`${id}: models[${j}]`, m, ['name', 'sessions'], errors);
        if ('name' in m && !isStr(m.name)) errors.push(`${id}: models[${j}].name must be text`);
        if ('sessions' in m && !(isInt(m.sessions) && m.sessions > 0)) errors.push(`${id}: models[${j}].sessions must be a positive integer`);
      });
    }
    const p = raw.portfolio;
    if ('portfolio' in raw) {
      if (!isRec(p)) errors.push(`${id}: portfolio must be a mapping`);
      else {
        checkKeys(`${id}: portfolio`, p, PORTFOLIO_FIELDS, errors);
        for (const f of ['name', 'pitch', 'release', 'demo_url', 'repo_url', 'example_pr_url'] as const)
          if (f in p && !isStr(p[f])) errors.push(`${id}: portfolio.${f} must be text`);
        if ('tests' in p && !(isInt(p.tests) && p.tests >= 0)) errors.push(`${id}: portfolio.tests must be an integer`);
        if ('stack' in p && !(Array.isArray(p.stack) && p.stack.length > 0 && p.stack.every(isStr))) errors.push(`${id}: portfolio.stack must be a list of text`);
        if ('released_on' in p && !(typeof p.released_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.released_on))) errors.push(`${id}: portfolio.released_on must be a date written YYYY-MM-DD`);
      }
    }
    const h = raw.headline;
    if ('headline' in raw) {
      if (!isRec(h)) errors.push(`${id}: headline must be a mapping`);
      else {
        checkKeys(`${id}: headline`, h, HEADLINE_FIELDS, errors);
        if ('value' in h && !isStr(h.value)) errors.push(`${id}: headline.value must be text`);
        if ('label' in h && !(isStr(h.label) && h.label.length <= 40)) errors.push(`${id}: headline.label must be text of at most 40 characters`);
        if ('n' in h && !(h.n === null || (isInt(h.n) && h.n > 0))) errors.push(`${id}: headline.n must be a positive integer or null`);
        if ('kind' in h && h.kind !== 'tests' && h.kind !== 'measured') errors.push(`${id}: headline.kind must be tests or measured`);
        if ('source_url' in h && !(isStr(h.source_url) && /^https:\/\//.test(h.source_url))) errors.push(`${id}: headline.source_url must be an https URL`);
        // REQ-016 and REQ-017
        if (h.kind === 'tests' && isRec(p) && isInt(p.tests) && h.value !== String(p.tests))
          errors.push(`${id}: headline.value "${String(h.value)}" must equal portfolio.tests ${p.tests} when kind is tests`);
        if (h.kind === 'measured' && isRec(p) && isStr(p.repo_url) && !(isStr(h.source_url) && h.source_url.startsWith(p.repo_url)))
          errors.push(`${id}: headline.source_url must start with portfolio.repo_url when kind is measured`);
      }
    }
    if (isInt(raw.order)) { if (orders.has(raw.order)) errors.push(`${id}: order ${raw.order} is used by another entry`); orders.add(raw.order); }
    if (typeof raw.slug === 'string') { if (slugs.has(raw.slug)) errors.push(`${id}: slug is used by another entry`); slugs.add(raw.slug); }
  });
  return errors;
}

export function sortedProjects(data: Project[]): Project[] {
  return [...data].sort((a, b) => a.order - b.order);
}
