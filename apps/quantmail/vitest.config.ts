import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['api-v2/**/__tests__/**/*.test.ts'],
  },
});
