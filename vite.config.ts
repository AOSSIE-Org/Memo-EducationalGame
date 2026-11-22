/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base: the build works from any folder of any static host.
  base: './',
  plugins: [
    svelte(),
    VitePWA({
      // A new version waits until the player taps the ↻ button (src/lib/update.svelte.ts).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        id: './',
        name: 'Memo',
        short_name: 'Memo',
        description: 'A memory card game: find the pairs and learn shapes, colours, capitals and your own cards. A free game for children by AOSSIE.',
        lang: 'en',
        dir: 'ltr',
        categories: ['education', 'games', 'kids'],
        theme_color: '#00843D',
        background_color: '#FFFFFF',
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        start_url: './',
        scope: './',
        prefer_related_applications: false,
        // Shown by Android's richer install dialog.
        screenshots: [
          { src: 'screenshots/wide.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Memo' },
          { src: 'screenshots/narrow.png', sizes: '844x390', type: 'image/png', form_factor: 'narrow', label: 'Memo' },
        ],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything, including every card picture, is downloaded at install,
        // so that every card set works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webp}', 'credits-i18n/*.json'],
        // Only used by social media previews and install dialogs.
        globIgnores: ['og-image.png', 'screenshots/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        importScripts: ['sw-reminder.js'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
