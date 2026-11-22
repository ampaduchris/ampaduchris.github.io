import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

/** One dated observation. `date` is a day (YYYY-MM-DD) or a month (YYYY-MM): the precision the source holds (REQ-081). */
export interface EvidenceRow { id: string; date: string; observation: string; recorded?: string }

const FIELDS = ['id', 'date', 'observation', 'recorded'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// No row may carry an address of any kind (REQ-080). The scrubber is the other half of this control.
const FORBIDDEN: [RegExp, string][] = [[/https?:|www\./i, 'a URL'], [/@/, 'an at sign or email address'], [/\d{5,}/, 'a run of five or more digits']];

export function validDate(d: unknown): d is string {
  if (typeof d !== 'string') return false;
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(d);
  if (!m) return false;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return false;
  if (m[3] === undefined) return true;
  const day = Number(m[3]);
  const last = new Date(Date.UTC(Number(m[1]), month, 0)).getUTCDate();
  return day >= 1 && day <= last;
}

/** Errors name the row and the field (REQ-079, REQ-080). An empty list means valid. */
export function validateEvidence(data: unknown): string[] {
  if (!Array.isArray(data)) return ['evidence.yml must be a list of rows'];
  const errors: string[] = [];
  const seen = new Set<string>();
  data.forEach((raw, i) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const name = typeof r.id === 'string' && r.id ? r.id : `row ${i + 1}`;
    for (const k of Object.keys(r)) if (!FIELDS.includes(k)) errors.push(`${name}: unknown field ${k}`);
    for (const k of ['id', 'date', 'observation']) if (r[k] === undefined) errors.push(`${name}: missing field ${k}`);
    if (r.id !== undefined) {
      if (typeof r.id !== 'string' || !/^E\d+$/.test(r.id)) errors.push(`${name}: field id must be E and digits`);
      else if (seen.has(r.id)) errors.push(`${name}: field id repeats an earlier row`);
      else seen.add(r.id);
    }
    if (r.date !== undefined && !validDate(r.date)) errors.push(`${name}: field date must be YYYY-MM-DD or YYYY-MM`);
    for (const k of ['observation', 'recorded']) {
      const v = r[k];
      if (v === undefined) continue;
      if (typeof v !== 'string' || !v.trim()) { errors.push(`${name}: field ${k} must be a non-empty string`); continue; }
      for (const [re, what] of FORBIDDEN) if (re.test(v)) errors.push(`${name}: field ${k} holds ${what}`);
    }
  });
  return errors;
}

export function formatEvidenceDate(d: string): { text: string; datetime: string } {
  const [y, m, day] = d.split('-');
  const month = MONTHS[Number(m) - 1];
  return { text: day === undefined ? `${month} ${y}` : `${Number(day)} ${month} ${y}`, datetime: d };
}

export function idNumber(id: string): number { return Number(id.slice(1)); }

export function parseEvidence(text: string): EvidenceRow[] {
  const data = parse(text);
  const errors = validateEvidence(data);
  if (errors.length) throw new Error(`evidence.yml is invalid:\n  ${errors.join('\n  ')}`);
  return (data as EvidenceRow[]).map((r) => ({ ...r, date: String(r.date) }));
}

export function loadEvidence(): EvidenceRow[] {
  return parseEvidence(readFileSync(resolve(process.cwd(), 'src/data/evidence.yml'), 'utf8'));
}
