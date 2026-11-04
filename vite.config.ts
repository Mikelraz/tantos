import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/tantos/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
      },
      manifest: {
        name: 'Tantos',
        short_name: 'Tantos',
        description: 'Practica a contar los tantos de una mano de mus.',
        lang: 'es',
        display: 'standalone',
        start_url: '/tantos/',
        scope: '/tantos/',
        theme_color: '#145238',
        background_color: '#1d7049',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
  },
});
