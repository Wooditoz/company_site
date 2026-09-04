// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://moadigital.co',
  integrations: [
    tailwind({ applyBaseStyles: false }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'th'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
});
