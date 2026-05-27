'use client';

import { Skeleton } from '@quant/shared-ui';

export default function Loading() {
  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-[var(--quant-border)]">
        <Skeleton variant="text" width="150px" height="24px" />
      </div>
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton variant="circle" width="48px" height="48px" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="120px" height="16px" />
              <Skeleton variant="text" width="200px" height="14px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
