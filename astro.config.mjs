// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://pocketlorestudios.com',
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  integrations: [sitemap()],
  build: { inlineStylesheets: 'never' },
  vite: { build: { assetsInlineLimit: 0 } }
});
