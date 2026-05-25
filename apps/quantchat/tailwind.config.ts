import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', '../../packages/shared-ui/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        quant: {
          primary: '#3b82f6',
          secondary: '#8b5cf6',
        },
      },
    },
  },
  plugins: [],
};

export default config;
