import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const CREAM = '#FBF7F0';

/**
 * Where the app is served from. GitHub Pages project sites live under
 * /<repo>/, so the deploy workflow sets BASE_PATH; everywhere else it's /.
 */
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { config: true },
      manifest: {
        name: 'Food Swipe',
        short_name: 'Food Swipe',
        description: 'Swipe your way to what to eat.',
        theme_color: CREAM,
        background_color: CREAM,
        display: 'standalone',
        orientation: 'portrait',
        scope: base,
        start_url: base,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Fonts for other scripts load on demand; precache only the Latin subsets.
        globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,greek-ext,vietnamese}-*.woff2'],
        navigateFallback: `${base}index.html`,
      },
    }),
  ],
});
