export interface NavLink { href: string; label: string }

export const NAV: NavLink[] = [
  { href: '/method/', label: 'Method' },
  { href: '/contact/', label: 'Contact' },
];

/** Notes comes first and exists only once a note does (DESIGN.md 6.10, REQ-074). */
export function navLinks(hasNotes: boolean): NavLink[] {
  return hasNotes ? [{ href: '/notes/', label: 'Notes' }, ...NAV] : NAV;
}
