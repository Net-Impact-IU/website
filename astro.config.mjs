// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL and BASE_PATH are set by the deploy workflow.
// Custom domain (netimpactiu.org): BASE_PATH = "/"
// GitHub Pages default address (net-impact-iu.github.io/website): BASE_PATH = "/website"
const site = process.env.SITE_URL || 'https://netimpactiu.org';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  // CSS is inlined into each page so the browser doesn't wait on a separate stylesheet request.
  build: { format: 'directory', inlineStylesheets: 'always' },
});
