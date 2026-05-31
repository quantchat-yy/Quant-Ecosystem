'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';

interface BreadcrumbsProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export function Breadcrumbs({ currentPath, onNavigate }: BreadcrumbsProps) {
  const segments = currentPath.split('/').filter(Boolean);

  const breadcrumbs = [
    { label: 'My Files', path: '' },
    ...segments.map((segment, index) => ({
      label: segment,
      path: segments.slice(0, index + 1).join('/'),
    })),
  ];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm overflow-hidden">
      <ol className="flex items-center gap-1 min-w-0">
        <AnimatePresence mode="popLayout">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <motion.li
                key={crumb.path || 'root'}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ type: 'spring', ...spring.snappy }}
                className="flex items-center gap-1 min-w-0"
              >
                {index > 0 && (
                  <span
                    className="text-[var(--quant-muted-foreground)] flex-shrink-0"
                    aria-hidden="true"
                  >
                    /
                  </span>
                )}
                {isLast ? (
                  <span
                    className="font-medium text-[var(--quant-foreground)] truncate max-w-[150px] sm:max-w-[200px]"
                    aria-current="page"
                    title={crumb.label}
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <button
                    onClick={() => onNavigate(crumb.path)}
                    className="text-[var(--quant-muted-foreground)] hover:text-[var(--quant-foreground)] transition-colors truncate max-w-[100px] sm:max-w-[150px]"
                    title={crumb.label}
                  >
                    {crumb.label}
                  </button>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </nav>
  );
}
