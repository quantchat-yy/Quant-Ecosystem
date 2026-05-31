'use client';

// ============================================================================
// Shared UI - Empty State Component
// ============================================================================

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useMotionConfig } from '../Motion/MotionConfig';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  animated?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  animated = true,
}) => {
  const { shouldAnimate: contextAnimate } = useMotionConfig();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animated && contextAnimate && !prefersReducedMotion;

  const content = (
    <>
      {icon ? (
        <div className="mb-4 text-[var(--quant-muted-foreground)]">{icon}</div>
      ) : (
        <svg
          className="w-16 h-16 mb-4 text-[var(--quant-muted-foreground)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      )}
      <h3 className="text-lg font-semibold text-[var(--quant-foreground)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--quant-muted-foreground)] max-w-sm mb-4">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 text-sm font-medium text-white bg-[var(--brand-primary)] rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2"
        >
          {actionLabel}
        </button>
      )}
    </>
  );

  if (!shouldAnimate) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center" role="status">
        {content}
      </div>
    );
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center p-8 text-center"
      role="status"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {content}
    </motion.div>
  );
};
