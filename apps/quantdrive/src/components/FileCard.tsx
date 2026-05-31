'use client';

import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import type { FileItem } from '../hooks/useFiles';

interface FileCardProps {
  file: FileItem;
  onClick: () => void;
  viewMode: 'grid' | 'list';
}

function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '\u{1F5BC}';
  if (mimeType.startsWith('video/')) return '\u{1F3AC}';
  if (mimeType.startsWith('audio/')) return '\u{1F3B5}';
  if (mimeType.includes('pdf')) return '\u{1F4C4}';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '\u{1F4CA}';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '\u{1F4CA}';
  if (mimeType.includes('document') || mimeType.includes('word')) return '\u{1F4DD}';
  if (mimeType.includes('zip') || mimeType.includes('archive')) return '\u{1F4E6}';
  if (mimeType.includes('text')) return '\u{1F4C3}';
  return '\u{1F4C1}';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function FileCard({ file, onClick, viewMode }: FileCardProps) {
  if (viewMode === 'list') {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', ...spring.snappy }}
        className="w-full flex items-center gap-4 px-4 py-3 min-h-[44px] hover:bg-[var(--quant-muted)] rounded-lg transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)] focus-visible:ring-offset-2"
        aria-label={`File: ${file.name}`}
      >
        <span className="text-2xl flex-shrink-0" aria-hidden="true">
          {getFileIcon(file.mimeType)}
        </span>
        <span className="flex-1 min-w-0 truncate font-medium text-sm">{file.name}</span>
        <span className="text-xs text-[var(--quant-muted-foreground)] flex-shrink-0">
          {formatFileSize(file.size)}
        </span>
        <span className="text-xs text-[var(--quant-muted-foreground)] flex-shrink-0 hidden sm:inline">
          {formatDate(file.updatedAt)}
        </span>
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
      aria-label={`File: ${file.name}`}
    >
      {file.thumbnailUrl && file.mimeType.startsWith('image/') ? (
        <div className="relative w-full h-16 mb-3 rounded overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--quant-muted)] to-[var(--quant-border)] blur-sm opacity-60" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={file.thumbnailUrl}
            alt=""
            className="relative w-full h-full object-cover rounded"
          />
        </div>
      ) : (
        <span className="text-4xl mb-3" aria-hidden="true">
          {getFileIcon(file.mimeType)}
        </span>
      )}
      <span className="text-sm font-medium truncate w-full">{file.name}</span>
      <span className="text-xs text-[var(--quant-muted-foreground)] mt-1">
        {formatFileSize(file.size)}
      </span>
      <span className="text-xs text-[var(--quant-muted-foreground)]">
        {formatDate(file.updatedAt)}
      </span>
    </motion.button>
  );
}
