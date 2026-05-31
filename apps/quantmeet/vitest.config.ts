import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environmentMatchGlobs: [['src/__tests__/**', 'jsdom']],
    include: ['backend/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.{ts,tsx}'],
  },
});
