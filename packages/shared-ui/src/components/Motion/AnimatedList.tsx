// ============================================================================
// Shared UI - AnimatedList Component
// ============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { spring } from '@quant/brand';

export interface AnimatedListProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      ...spring.snappy,
    },
  },
};

export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  staggerDelay = 0.05,
  className = '',
}) => {
  const container = {
    ...containerVariants,
    visible: {
      ...containerVariants.visible,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className={className}>
      {React.Children.map(children, (child) => (
        <motion.div variants={itemVariants}>{child}</motion.div>
      ))}
    </motion.div>
  );
};
