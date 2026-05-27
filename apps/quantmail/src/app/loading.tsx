'use client';

import { Skeleton } from '@quant/shared-ui';

export default function Loading() {
  return (
    <div className="flex h-screen">
      <div className="w-64 border-r border-[var(--quant-border)] p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="text" width="100%" height="32px" />
        ))}
      </div>
      <div className="flex-1 p-4 space-y-4">
        <Skeleton variant="rect" width="100%" height="40px" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rect" width="100%" height="72px" />
        ))}
      </div>
    </div>
  );
}
