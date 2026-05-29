import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Root config is used by the coverage job (`vitest run --coverage`). Unit/integration
    // tests live in packages/apps/services; Playwright specs under e2e/ must NOT run here
    // (they require the Playwright runner + a live server, not vitest).
    include: [
      'packages/**/*.{test,spec}.{ts,tsx}',
      'apps/**/*.{test,spec}.{ts,tsx}',
      'services/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', 'e2e/**'],
    // Per-package configs set environment: 'jsdom' for UI tests. The root config must honor
    // that for DOM-dependent tests (e.g. shared-ui sanitize/DOMPurify), else they run in node
    // and silently no-op. Default to node; use jsdom for UI code and component tests.
    environmentMatchGlobs: [
      ['**/shared-ui/**', 'jsdom'],
      ['**/*.tsx', 'jsdom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'html'],
      // Exclude non-product code from the coverage denominator so the metric is meaningful:
      // test/spec files, e2e specs, build output, configs, type decls, scripts, generated.
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '**/__tests__/**',
        '**/*.{test,spec}.{ts,tsx}',
        'e2e/**',
        'scripts/**',
        '**/*.config.{ts,js,mjs,cjs}',
        '**/*.d.ts',
      ],
      thresholds: {
        statements: 50,
        branches: 50,
        functions: 50,
        lines: 50,
      },
    },
  },
});
