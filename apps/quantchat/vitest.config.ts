import { defineConfig } from 'vitest/config';

// quantchat's tsconfig sets `jsx: "preserve"` (required by Next.js), which leaves JSX
// untransformed when component (.tsx) modules are imported directly into vitest specs.
// Override the JSX transform to esbuild's automatic runtime so test files can import
// React components/hooks (e.g. InAppToast.tsx, NotificationSettings.tsx). This mirrors
// the root vitest config's test settings so existing quantchat suites behave identically;
// it only adds the JSX transform. DOM-dependent specs opt into jsdom via the
// `// @vitest-environment jsdom` file directive (default stays node).
export default defineConfig({
  // This repo runs rolldown-vite (Vite 8), whose transformer is oxc rather than esbuild.
  // oxc reads the app tsconfig (`jsx: "preserve"`) by default, leaving JSX untransformed;
  // override it to the automatic React runtime so component (.tsx) modules can be imported
  // into specs.
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'react',
    },
  },
  test: {
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', 'e2e/**'],
    environmentMatchGlobs: [['**/*.tsx', 'jsdom']],
  },
});
