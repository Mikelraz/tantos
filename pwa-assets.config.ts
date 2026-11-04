import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: { sizes: [192, 512], favicons: [] },
    maskable: { sizes: [512], padding: 0.2, resizeOptions: { background: '#1d7049' } },
    apple: { sizes: [180], padding: 0.2, resizeOptions: { background: '#1d7049' } },
  },
  images: ['public/icono.svg'],
});
