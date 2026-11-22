import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { existsSync, readdirSync } from 'node:fs';

// /notes/ is listed only once a note exists (REQ-086). The fixture build reads the fixture notes.
// NOTES_FIXTURE=none is the empty build: a folder that does not exist (same rule as notesDir in src/lib/notes.ts).
const notesDir = process.env.NOTES_FIXTURE === 'none' ? 'tests/fixtures/notes-none' : process.env.NOTES_FIXTURE ? 'tests/fixtures/notes' : 'src/content/notes';
const hasNotes = existsSync(notesDir) && readdirSync(notesDir).some((f) => f.endsWith('.mdx'));

export default defineConfig({
  site: 'https://ampaduchris.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [mdx(), sitemap({ filter: (page) => !/\/(404|cv|in)(\/|$)/.test(page) && (hasNotes || !/\/notes(\/|$)/.test(page)) })],
  devToolbar: { enabled: false },
});
