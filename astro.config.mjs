import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://ampaduchris.github.io',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap({ filter: (page) => !/\/(404|cv|in)(\/|$)/.test(page) })],
  devToolbar: { enabled: false },
});
