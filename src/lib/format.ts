import type { Stat } from './numbers';

/** The text a statistic shows as its value, or null when it is not shown (REQ-025). */
export function valueText(stat: Stat): string | null {
  if (stat.value === null) return null;
  if (Array.isArray(stat.value)) return stat.value.map((m) => `${m.name} · ${m.sessions}`).join('; ');
  return String(stat.value);
}

/** The accessible name of a statistic tile: the sample size is always in it (REQ-023). */
export function statName(stat: Stat): string {
  const v = valueText(stat);
  return `${stat.label}: ${v === null ? 'not shown yet' : v}. n = ${stat.n}`;
}

export function hoursText(h: number | null): string {
  return h === null ? '' : h.toFixed(1);
}
