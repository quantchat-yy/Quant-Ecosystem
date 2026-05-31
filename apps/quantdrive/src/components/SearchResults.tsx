'use client';

import { EmptyState } from '@quant/shared-ui';
import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import { useFiles } from '../hooks/useFiles';
import type { FileItem } from '../hooks/useFiles';

interface SearchResultsProps {
  query: string;
  onFileSelect: (file: FileItem) => void;
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
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', ...spring.gentle },
  },
};

function SearchSkeleton() {
  const items = Array.from({ length: 5 }, (_, i) => i);
  return (
    <div className="space-y-1">
      {items.map((i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg animate-pulse">
          <div className="w-8 h-8 rounded bg-[var(--quant-muted)]" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-3/4 rounded bg-[var(--quant-muted)]" />
            <div className="h-3 w-1/2 rounded bg-[var(--quant-muted)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SearchResults({ query, onFileSelect }: SearchResultsProps) {
  const { data: files, isLoading } = useFiles(`search:${query}`);

  if (isLoading) {
    return <SearchSkeleton />;
  }

  if (!files || files.length === 0) {
    return (
      <EmptyState
        title="No results found"
        description={`No files matching "${query}" were found.`}
      />
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-1"
      role="list"
      aria-label="Search results"
    >
      {files.map((file) => (
        <motion.button
          key={file.id}
          variants={itemVariants}
          onClick={() => onFileSelect(file)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', ...spring.snappy }}
          className="w-full flex items-center gap-4 px-4 py-3 min-h-[44px] hover:bg-[var(--quant-muted)] rounded-lg transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)]"
          role="listitem"
          aria-label={`${file.type === 'folder' ? 'Folder' : 'File'}: ${file.name}`}
        >
          <span className="text-2xl flex-shrink-0" aria-hidden="true">
            {file.type === 'folder' ? '\u{1F4C1}' : '\u{1F4C4}'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-[var(--quant-foreground)]">
              {file.name}
            </p>
            <p className="text-xs text-[var(--quant-muted-foreground)] truncate">{file.path}</p>
          </div>
        </motion.button>
      ))}
    </motion.div>
  );
}
