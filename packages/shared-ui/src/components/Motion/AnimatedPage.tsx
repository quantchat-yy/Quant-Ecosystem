// ============================================================================
// Shared UI - AnimatedPage Component
// ============================================================================

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '@quant/brand';

export type PageTransitionVariant = 'slide-left' | 'slide-right' | 'fade' | 'scale';

export interface AnimatedPageProps {
  children: React.ReactNode;
  variant?: PageTransitionVariant;
  className?: string;
  pageKey?: string;
}

const variants = {
  'slide-left': {
    initial: { x: 30, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -30, opacity: 0 },
  },
  'slide-right': {
    initial: { x: -30, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 30, opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
  },
} as const;

export const AnimatedPage: React.FC<AnimatedPageProps> = ({
  children,
  variant = 'fade',
  className = '',
  pageKey,
}) => {
  const transition = {
    type: 'spring' as const,
    ...spring.gentle,
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={variants[variant].initial}
        animate={variants[variant].animate}
        exit={variants[variant].exit}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
