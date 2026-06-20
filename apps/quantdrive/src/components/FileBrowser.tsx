'use client';

import { Select, EmptyState, ErrorState } from '@quant/shared-ui';
import type { SelectOption } from '@quant/shared-ui';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { useFiles } from '../hooks/useFiles';
import type { FileItem } from '../hooks/useFiles';
import { FileCard } from './FileCard';
import { FolderCard } from './FolderCard';

interface FileBrowserProps {
  currentPath: string;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onFileSelect: (file: FileItem) => void;
  onFolderOpen: (path: string) => void;
}

const SORT_OPTIONS: SelectOption[] = [
  { value: 'name', label: 'Name' },
  { value: 'modified', label: 'Modified' },
  { value: 'size', label: 'Size' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', ...spring.gentle },
  },
};

function LoadingSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  const items = Array.from({ length: 8 }, (_, i) => i);

  if (viewMode === 'list') {
    return (
      <div className="space-y-1">
        {items.map((i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg animate-pulse">
            <div className="w-8 h-8 rounded bg-[var(--quant-muted)]" />
            <div className="flex-1 h-4 rounded bg-[var(--quant-muted)]" />
            <div className="w-16 h-3 rounded bg-[var(--quant-muted)]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((i) => (
        <div
          key={i}
          className="flex flex-col items-center p-4 rounded-lg border border-[var(--quant-border)] animate-pulse"
        >
          <div className="w-12 h-12 rounded bg-[var(--quant-muted)] mb-3" />
          <div className="w-full h-4 rounded bg-[var(--quant-muted)]" />
          <div className="w-2/3 h-3 rounded bg-[var(--quant-muted)] mt-1" />
        </div>
      ))}
    </div>
  );
}

export function FileBrowser({
  currentPath,
  viewMode,
  onViewModeChange,
  onFileSelect,
  onFolderOpen,
}: FileBrowserProps) {
  const { data: files, isLoading, error } = useFiles(currentPath);
  const [sortBy, setSortBy] = useState('name');

  if (isLoading) {
    return <LoadingSkeleton viewMode={viewMode} />;
  }

  if (error) {
    return <ErrorState title="Failed to load files" message={error.message} />;
  }

  if (!files || files.length === 0) {
    return (
      <EmptyState
        title="No files"
        description="This folder is empty. Upload files to get started."
      />
    );
  }

  const sortedFiles = [...files].sort((a, b) => {
    switch (sortBy) {
      case 'modified':
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      case 'size':
        return b.size - a.size;
      default:
        return a.name.localeCompare(b.name);
    }
  });

  const folders = sortedFiles.filter((f) => f.type === 'folder');
  const fileItems = sortedFiles.filter((f) => f.type === 'file');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-[var(--quant-primary)] text-white'
                : 'text-[var(--quant-muted-foreground)] hover:bg-[var(--quant-muted)]'
            }`}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="1" y="1" width="6" height="6" rx="1" />
              <rect x="9" y="1" width="6" height="6" rx="1" />
              <rect x="1" y="9" width="6" height="6" rx="1" />
              <rect x="9" y="9" width="6" height="6" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--quant-primary)] text-white'
                : 'text-[var(--quant-muted-foreground)] hover:bg-[var(--quant-muted)]'
            }`}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="1" y="2" width="14" height="2" rx="1" />
              <rect x="1" y="7" width="14" height="2" rx="1" />
              <rect x="1" y="12" width="14" height="2" rx="1" />
            </svg>
          </button>
        </div>

        <div className="w-40">
          <Select
            options={SORT_OPTIONS}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort files by"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          >
            {folders.map((folder) => (
              <motion.div
                key={folder.id}
                variants={itemVariants}
                style={{ contentVisibility: 'auto' }}
              >
                <FolderCard
                  folder={folder}
                  onClick={() => onFolderOpen(folder.path)}
                  viewMode="grid"
                />
              </motion.div>
            ))}
            {fileItems.map((file) => (
              <motion.div
                key={file.id}
                variants={itemVariants}
                style={{ contentVisibility: 'auto' }}
              >
                <FileCard file={file} onClick={() => onFileSelect(file)} viewMode="grid" />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-1"
          >
            {folders.map((folder) => (
              <motion.div
                key={folder.id}
                variants={itemVariants}
                style={{ contentVisibility: 'auto' }}
              >
                <FolderCard
                  folder={folder}
                  onClick={() => onFolderOpen(folder.path)}
                  viewMode="list"
                />
              </motion.div>
            ))}
            {fileItems.map((file) => (
              <motion.div
                key={file.id}
                variants={itemVariants}
                style={{ contentVisibility: 'auto' }}
              >
                <FileCard file={file} onClick={() => onFileSelect(file)} viewMode="list" />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
