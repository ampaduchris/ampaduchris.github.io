// Written-out forms for abbreviations that appear in project text (style rule: every abbreviation written out at first use).
const FORMS: Record<string, string> = {
  PDF: 'Portable Document Format',
  PDFs: 'Portable Document Format',
  API: 'application programming interface',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escapes the text, then wraps each known abbreviation in <abbr title="...">. */
export function withAbbr(text: string): string {
  return esc(text).replace(/\b(PDFs|PDF|API)\b/g, (m) => `<abbr title="${FORMS[m]}">${m}</abbr>`);
}
