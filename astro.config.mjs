// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: "https://svenvollbrecht.de",
  i18n: {
    defaultLocale: "de",
    locales: ["de", "en"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false
    }
  },
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()]
  }
});