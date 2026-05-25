// ============================================================================
// Shared UI - Design Tokens (CSS Variables Map)
// ============================================================================

export interface DesignTokens {
  colors: Record<string, string>;
  spacing: Record<string, string>;
  typography: Record<string, string>;
  shadows: Record<string, string>;
  transitions: Record<string, string>;
  borderRadius: Record<string, string>;
}

export const lightTokens: DesignTokens = {
  colors: {
    '--color-primary': '#3B82F6',
    '--color-primary-hover': '#2563EB',
    '--color-secondary': '#6B7280',
    '--color-accent': '#8B5CF6',
    '--color-background': '#FFFFFF',
    '--color-surface': '#F9FAFB',
    '--color-text': '#111827',
    '--color-text-secondary': '#6B7280',
    '--color-border': '#E5E7EB',
    '--color-error': '#EF4444',
    '--color-warning': '#F59E0B',
    '--color-success': '#10B981',
    '--color-info': '#3B82F6',
  },
  spacing: {
    '--spacing-xs': '0.25rem',
    '--spacing-sm': '0.5rem',
    '--spacing-md': '1rem',
    '--spacing-lg': '1.5rem',
    '--spacing-xl': '2rem',
    '--spacing-2xl': '3rem',
    '--spacing-3xl': '4rem',
  },
  typography: {
    '--font-heading': 'Inter, system-ui, -apple-system, sans-serif',
    '--font-body': 'Inter, system-ui, -apple-system, sans-serif',
    '--font-mono': 'JetBrains Mono, Fira Code, monospace',
    '--font-size-xs': '0.75rem',
    '--font-size-sm': '0.875rem',
    '--font-size-md': '1rem',
    '--font-size-lg': '1.125rem',
    '--font-size-xl': '1.25rem',
    '--font-size-2xl': '1.5rem',
    '--font-size-3xl': '2rem',
    '--font-weight-normal': '400',
    '--font-weight-medium': '500',
    '--font-weight-semibold': '600',
    '--font-weight-bold': '700',
    '--line-height-tight': '1.25',
    '--line-height-normal': '1.5',
    '--line-height-relaxed': '1.75',
  },
  shadows: {
    '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  transitions: {
    '--transition-fast': '150ms ease-in-out',
    '--transition-normal': '200ms ease-in-out',
    '--transition-slow': '300ms ease-in-out',
  },
  borderRadius: {
    '--radius-sm': '0.25rem',
    '--radius-md': '0.5rem',
    '--radius-lg': '0.75rem',
    '--radius-xl': '1rem',
    '--radius-full': '9999px',
  },
};

export const darkTokens: DesignTokens = {
  colors: {
    '--color-primary': '#60A5FA',
    '--color-primary-hover': '#93C5FD',
    '--color-secondary': '#9CA3AF',
    '--color-accent': '#A78BFA',
    '--color-background': '#111827',
    '--color-surface': '#1F2937',
    '--color-text': '#F9FAFB',
    '--color-text-secondary': '#9CA3AF',
    '--color-border': '#374151',
    '--color-error': '#F87171',
    '--color-warning': '#FBBF24',
    '--color-success': '#34D399',
    '--color-info': '#60A5FA',
  },
  spacing: {
    '--spacing-xs': '0.25rem',
    '--spacing-sm': '0.5rem',
    '--spacing-md': '1rem',
    '--spacing-lg': '1.5rem',
    '--spacing-xl': '2rem',
    '--spacing-2xl': '3rem',
    '--spacing-3xl': '4rem',
  },
  typography: {
    '--font-heading': 'Inter, system-ui, -apple-system, sans-serif',
    '--font-body': 'Inter, system-ui, -apple-system, sans-serif',
    '--font-mono': 'JetBrains Mono, Fira Code, monospace',
    '--font-size-xs': '0.75rem',
    '--font-size-sm': '0.875rem',
    '--font-size-md': '1rem',
    '--font-size-lg': '1.125rem',
    '--font-size-xl': '1.25rem',
    '--font-size-2xl': '1.5rem',
    '--font-size-3xl': '2rem',
    '--font-weight-normal': '400',
    '--font-weight-medium': '500',
    '--font-weight-semibold': '600',
    '--font-weight-bold': '700',
    '--line-height-tight': '1.25',
    '--line-height-normal': '1.5',
    '--line-height-relaxed': '1.75',
  },
  shadows: {
    '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.1)',
    '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.2)',
    '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.2)',
    '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.2)',
  },
  transitions: {
    '--transition-fast': '150ms ease-in-out',
    '--transition-normal': '200ms ease-in-out',
    '--transition-slow': '300ms ease-in-out',
  },
  borderRadius: {
    '--radius-sm': '0.25rem',
    '--radius-md': '0.5rem',
    '--radius-lg': '0.75rem',
    '--radius-xl': '1rem',
    '--radius-full': '9999px',
  },
};

export const neonTokens: DesignTokens = {
  colors: {
    '--color-primary': '#22D3EE',
    '--color-primary-hover': '#67E8F9',
    '--color-secondary': '#A855F7',
    '--color-accent': '#F472B6',
    '--color-background': '#0F0F23',
    '--color-surface': '#1A1A2E',
    '--color-text': '#E0E7FF',
    '--color-text-secondary': '#94A3B8',
    '--color-border': '#334155',
    '--color-error': '#FB7185',
    '--color-warning': '#FCD34D',
    '--color-success': '#4ADE80',
    '--color-info': '#22D3EE',
  },
  spacing: {
    '--spacing-xs': '0.25rem',
    '--spacing-sm': '0.5rem',
    '--spacing-md': '1rem',
    '--spacing-lg': '1.5rem',
    '--spacing-xl': '2rem',
    '--spacing-2xl': '3rem',
    '--spacing-3xl': '4rem',
  },
  typography: {
    '--font-heading': 'Inter, system-ui, -apple-system, sans-serif',
    '--font-body': 'Inter, system-ui, -apple-system, sans-serif',
    '--font-mono': 'JetBrains Mono, Fira Code, monospace',
    '--font-size-xs': '0.75rem',
    '--font-size-sm': '0.875rem',
    '--font-size-md': '1rem',
    '--font-size-lg': '1.125rem',
    '--font-size-xl': '1.25rem',
    '--font-size-2xl': '1.5rem',
    '--font-size-3xl': '2rem',
    '--font-weight-normal': '400',
    '--font-weight-medium': '500',
    '--font-weight-semibold': '600',
    '--font-weight-bold': '700',
    '--line-height-tight': '1.25',
    '--line-height-normal': '1.5',
    '--line-height-relaxed': '1.75',
  },
  shadows: {
    '--shadow-sm': '0 1px 2px 0 rgb(0 0 0 / 0.2)',
    '--shadow-md': '0 4px 6px -1px rgb(0 0 0 / 0.3)',
    '--shadow-lg': '0 10px 15px -3px rgb(0 0 0 / 0.3)',
    '--shadow-xl': '0 20px 25px -5px rgb(0 0 0 / 0.3)',
  },
  transitions: {
    '--transition-fast': '150ms ease-in-out',
    '--transition-normal': '200ms ease-in-out',
    '--transition-slow': '300ms ease-in-out',
  },
  borderRadius: {
    '--radius-sm': '0.25rem',
    '--radius-md': '0.5rem',
    '--radius-lg': '0.75rem',
    '--radius-xl': '1rem',
    '--radius-full': '9999px',
  },
};

/**
 * Converts design tokens to a CSS variables string for injection into :root or a theme scope.
 */
export function tokensToCssVariables(tokens: DesignTokens): Record<string, string> {
  return {
    ...tokens.colors,
    ...tokens.spacing,
    ...tokens.typography,
    ...tokens.shadows,
    ...tokens.transitions,
    ...tokens.borderRadius,
  };
}
