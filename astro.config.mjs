// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	site: 'https://asipofcoffe.com',
	integrations: [sitemap()],
	// No "base" needed since we're using a custom domain (not a subpath)
});
