'use client';

import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import type { FileItem } from '../hooks/useFiles';

interface FolderCardProps {
  folder: FileItem;
  onClick: () => void;
  viewMode: 'grid' | 'list';
}

export function FolderCard({ folder, onClick, viewMode }: FolderCardProps) {
  if (viewMode === 'list') {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', ...spring.snappy }}
        className="w-full flex items-center gap-4 px-4 py-3 min-h-[44px] hover:bg-[var(--quant-muted)] rounded-lg transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)] focus-visible:ring-offset-2"
        aria-label={`Folder: ${folder.name}`}
      >
        <span className="text-2xl flex-shrink-0" aria-hidden="true">
          {'\u{1F4C1}'}
        </span>
        <span className="flex-1 min-w-0 truncate font-medium text-sm">{folder.name}</span>
        <span className="text-xs text-[var(--quant-muted-foreground)] flex-shrink-0">Folder</span>
      </motion.button>
    );
  }

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', ...spring.snappy }}
      className="flex flex-col items-center p-4 min-h-[44px] rounded-lg border border-[var(--quant-border)] hover:border-[var(--quant-primary)] hover:shadow-md transition-colors text-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)] focus-visible:ring-offset-2"
      aria-label={`Folder: ${folder.name}`}
    >
      <span className="text-4xl mb-3" aria-hidden="true">
        {'\u{1F4C1}'}
      </span>
      <span className="text-sm font-medium truncate w-full">{folder.name}</span>
    </motion.button>
  );
}
