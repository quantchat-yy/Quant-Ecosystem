'use client';

import { motion } from 'framer-motion';
import { Button } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { FileItem } from '../hooks/useFiles';

interface FilePreviewProps {
  file: FileItem;
  onClose: () => void;
  onShare: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : '';
}

function FilePreviewContent({ file }: { file: FileItem }) {
  if (file.mimeType.startsWith('image/')) {
    return (
      <div className="bg-[var(--quant-muted)] rounded-lg overflow-hidden">
        {file.thumbnailUrl ? (
          <img src={file.thumbnailUrl} alt={file.name} className="w-full h-48 object-contain" />
        ) : (
          <div className="h-48 flex items-center justify-center">
            <span className="text-5xl" aria-hidden="true">
              &#x1F5BC;
            </span>
          </div>
        )}
      </div>
    );
  }

  if (file.mimeType === 'application/pdf') {
    return (
      <div className="bg-[var(--quant-muted)] rounded-lg h-48 flex flex-col items-center justify-center gap-2">
        <span className="text-4xl" aria-hidden="true">
          &#x1F4C4;
        </span>
        <p className="text-sm font-medium">PDF Document</p>
        <p className="text-xs text-[var(--quant-muted-foreground)]">Preview not available</p>
      </div>
    );
  }

  if (file.mimeType.startsWith('video/')) {
    return (
      <div className="bg-gray-900 rounded-lg h-48 flex flex-col items-center justify-center gap-2">
        <span className="text-4xl" aria-hidden="true">
          &#x25B6;
        </span>
        <p className="text-sm text-gray-300">Video Preview</p>
        <p className="text-xs text-gray-500">{getFileExtension(file.name)} format</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--quant-muted)] rounded-lg h-40 flex items-center justify-center">
      <span className="text-5xl" aria-hidden="true">
        &#x1F4C4;
      </span>
    </div>
  );
}

export function FilePreview({ file, onClose, onShare }: FilePreviewProps) {
  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', ...spring.gentle }}
      className="w-full md:w-80 border-l border-[var(--quant-border)] bg-[var(--quant-background)] p-4 overflow-y-auto flex-shrink-0"
      aria-label="File preview panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold truncate text-[var(--quant-card-foreground)]">
          {file.name}
        </h2>
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', ...spring.snappy }}
          className="p-1 rounded-md text-[var(--quant-muted-foreground)] hover:text-[var(--quant-foreground)] hover:bg-[var(--quant-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--quant-ring)]"
          aria-label="Close preview"
        >
          &#10005;
        </motion.button>
      </div>

      <div className="mb-4">
        <FilePreviewContent file={file} />
      </div>

      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-[var(--quant-muted-foreground)]">Type</dt>
          <dd className="font-medium text-[var(--quant-card-foreground)]">{file.mimeType}</dd>
        </div>
        {getFileExtension(file.name) && (
          <div>
            <dt className="text-[var(--quant-muted-foreground)]">Extension</dt>
            <dd className="font-medium">.{getFileExtension(file.name).toLowerCase()}</dd>
          </div>
        )}
        <div>
          <dt className="text-[var(--quant-muted-foreground)]">Size</dt>
          <dd className="font-medium text-[var(--quant-card-foreground)]">
            {formatFileSize(file.size)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--quant-muted-foreground)]">Created</dt>
          <dd className="font-medium text-[var(--quant-card-foreground)]">
            {formatDate(file.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--quant-muted-foreground)]">Modified</dt>
          <dd className="font-medium text-[var(--quant-card-foreground)]">
            {formatDate(file.updatedAt)}
          </dd>
        </div>
        <div>
          <dt className="text-[var(--quant-muted-foreground)]">Location</dt>
          <dd className="font-medium text-[var(--quant-card-foreground)]">{file.path || '/'}</dd>
        </div>
      </dl>

      <div className="mt-6 space-y-2">
        <Button variant="primary" size="sm" onClick={onShare} className="w-full">
          Share
        </Button>
        <Button variant="secondary" size="sm" className="w-full" aria-label="Download file">
          Download
        </Button>
      </div>
    </motion.aside>
  );
}
