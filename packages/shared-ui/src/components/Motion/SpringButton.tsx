// ============================================================================
// Shared UI - SpringButton Component
// ============================================================================

import React from 'react';
import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import { Button } from '../Button';
import type { ButtonProps } from '../Button';

export interface SpringButtonProps extends ButtonProps {
  tapScale?: number;
  hoverScale?: number;
}

export const SpringButton: React.FC<SpringButtonProps> = ({
  tapScale = 0.95,
  hoverScale = 1.02,
  ...buttonProps
}) => {
  const transition = {
    type: 'spring' as const,
    ...spring.snappy,
  };

  return (
    <motion.div
      whileTap={{ scale: tapScale }}
      whileHover={{ scale: hoverScale }}
      transition={transition}
      style={{ display: 'inline-block' }}
    >
      <Button {...buttonProps} />
    </motion.div>
  );
};
