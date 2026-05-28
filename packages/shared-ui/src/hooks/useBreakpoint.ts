// ============================================================================
// Shared UI - useBreakpoint Hook
// ============================================================================

import { useState, useEffect } from 'react';
import { breakpoints } from '../themes/tokens';

export type BreakpointName = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpointOrder: BreakpointName[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const breakpointValues: Record<BreakpointName, number> = {
  xs: 0,
  sm: parseInt(breakpoints.sm),
  md: parseInt(breakpoints.md),
  lg: parseInt(breakpoints.lg),
  xl: parseInt(breakpoints.xl),
  '2xl': parseInt(breakpoints['2xl']),
};

function getCurrentBreakpoint(): BreakpointName {
  if (typeof window === 'undefined') return 'md';
  const width = window.innerWidth;
  for (let i = breakpointOrder.length - 1; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (bp !== undefined && width >= breakpointValues[bp]) {
      return bp;
    }
  }
  return 'xs';
}

/**
 * Returns the current breakpoint name based on window width
 * using the shared-ui breakpoint tokens.
 */
export function useBreakpoint(): BreakpointName {
  const [breakpoint, setBreakpoint] = useState<BreakpointName>(getCurrentBreakpoint);

  useEffect(() => {
    const handleResize = () => {
      setBreakpoint(getCurrentBreakpoint());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return breakpoint;
}
