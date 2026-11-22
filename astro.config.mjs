import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { existsSync, readdirSync } from 'node:fs';

// /notes/ is listed only once a note exists (REQ-086). The fixture build reads the fixture notes.
const notesDir = process.env.NOTES_FIXTURE ? 'tests/fixtures/notes' : 'src/content/notes';
const hasNotes = existsSync(notesDir) && readdirSync(notesDir).some((f) => f.endsWith('.mdx'));

export default defineConfig({
  site: 'https://ampaduchris.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [mdx(), sitemap({ filter: (page) => !/\/(404|cv|in)(\/|$)/.test(page) && (hasNotes || !/\/notes(\/|$)/.test(page)) })],
  devToolbar: { enabled: false },
});
