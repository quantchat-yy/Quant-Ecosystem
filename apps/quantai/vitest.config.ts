import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  // The app's tsconfig sets jsx:"preserve" (required by Next.js), which leaves JSX
  // untransformed and breaks vitest's import analysis on .tsx test suites. Overriding
  // the esbuild JSX transform here compiles JSX during tests without touching the
  // Next.js tsconfig. (Requires a Vite version that honors this override; vitest 3.x.)
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      // `@quant/payment` is a source-only engine (no published package / not linked
      // into this app's node_modules), so vitest cannot resolve the bare specifier
      // the payments route imports. Map it to its source entry so the route's seam
      // (real PaymentEngine + PaymentValidationError) can be exercised in tests.
      // This is test-only resolution and does not change runtime packaging.
      '@quant/payment': fileURLToPath(
        new URL('../../packages/payment/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.test.tsx',
      'backend/__tests__/**/*.test.ts',
    ],
  },
});
