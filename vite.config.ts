import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/tantos/',
  test: {
    environment: 'happy-dom',
  },
});
