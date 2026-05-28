'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { spring } from '@quant/brand';
import { useMotionConfig } from './MotionConfig';

export interface StaggerListProps {
  staggerDelay?: number;
  className?: string;
  children: React.ReactNode;
  as?: 'div' | 'ul' | 'ol';
  childAs?: 'div' | 'li';
}

const containerVariants = (staggerDelay: number) => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: spring.gentle.damping,
      stiffness: spring.gentle.stiffness,
      mass: spring.gentle.mass,
    },
  },
};

export function StaggerList({
  staggerDelay = 0.05,
  className,
  children,
  as = 'div',
  childAs,
}: StaggerListProps) {
  const { shouldAnimate: contextAnimate } = useMotionConfig();
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = contextAnimate && !prefersReducedMotion;

  const resolvedChildAs = childAs ?? (as === 'ul' || as === 'ol' ? 'li' : 'div');

  if (!shouldAnimate) {
    const Container = as;
    return <Container className={className}>{children}</Container>;
  }

  const MotionContainer = motion[as];
  const MotionChild = motion[resolvedChildAs];

  return (
    <MotionContainer
      className={className}
      variants={containerVariants(staggerDelay)}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child) => (
        <MotionChild variants={itemVariants}>{child}</MotionChild>
      ))}
    </MotionContainer>
  );
}
