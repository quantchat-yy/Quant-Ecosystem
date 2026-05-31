'use client';

import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import { useStorageQuota } from '../hooks/useStorageQuota';

export function StorageBar() {
  const { data: quota, isLoading } = useStorageQuota();

  if (isLoading || !quota) {
    return (
      <div className="space-y-2" aria-label="Storage usage loading">
        <div className="h-2 rounded-full bg-[var(--quant-muted)] animate-pulse" />
        <p className="text-xs text-[var(--quant-muted-foreground)]">Loading storage...</p>
      </div>
    );
  }

  const percentage = quota.total > 0 ? (quota.used / quota.total) * 100 : 0;

  const getBarColor = () => {
    if (percentage >= 90) return 'var(--quant-destructive)';
    if (percentage >= 70) return 'var(--quant-warning)';
    return 'var(--quant-success)';
  };

  return (
    <div
      className="space-y-2"
      role="progressbar"
      aria-valuenow={quota.used}
      aria-valuemin={0}
      aria-valuemax={quota.total}
      aria-label="Storage usage"
    >
      <div className="h-2 rounded-full bg-[var(--quant-muted)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: getBarColor() }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ type: 'spring', ...spring.gentle }}
        />
      </div>
      <p className="text-xs text-[var(--quant-muted-foreground)]">
        {quota.used} {quota.unit} of {quota.total} {quota.unit} used
      </p>
    </div>
  );
}
