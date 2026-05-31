'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUpload, Button } from '@quant/shared-ui';

const springGentle = { damping: 20, stiffness: 100, mass: 1 };
const springSnappy = { damping: 30, stiffness: 400, mass: 0.8 };

interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'complete' | 'cancelled';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function UploadArea() {
  const [uploads, setUploads] = useState<UploadFile[]>([]);

  const handleUpload = useCallback((files: File[]) => {
    const newUploads: UploadFile[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Simulate upload progress
    newUploads.forEach((upload) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setUploads((prev) =>
            prev.map((u) => (u.id === upload.id ? { ...u, progress: 100, status: 'complete' } : u)),
          );
        } else {
          setUploads((prev) => prev.map((u) => (u.id === upload.id ? { ...u, progress } : u)));
        }
      }, 500);
    });
  }, []);

  const cancelUpload = useCallback((uploadId: string) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, status: 'cancelled', progress: 0 } : u)),
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status === 'uploading'));
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('#drive-upload-input');
            input?.click();
          }}
        >
          Upload
        </Button>
        {uploads.some((u) => u.status === 'complete') && (
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            Clear completed
          </Button>
        )}
        <input id="drive-upload-input" type="file" multiple className="hidden" aria-hidden="true" />
      </div>
      <FileUpload
        multiple
        onUpload={handleUpload}
        aria-label="Drop files to upload"
        className="min-h-[80px]"
      />

      {/* Upload progress list */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', ...springGentle }}
            className="space-y-2"
          >
            <ul aria-label="Upload progress" className="space-y-2">
              {uploads.map((upload) => (
                <motion.li
                  key={upload.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ type: 'spring', ...springSnappy }}
                  className="flex items-center gap-3 p-2 rounded-md bg-[var(--quant-muted)]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{upload.name}</p>
                      <span className="text-xs text-[var(--quant-muted-foreground)] flex-shrink-0 ml-2">
                        {formatFileSize(upload.size)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[var(--quant-border)] rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            upload.status === 'complete'
                              ? 'bg-green-500'
                              : upload.status === 'cancelled'
                                ? 'bg-gray-400'
                                : 'bg-[var(--quant-primary)]'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${upload.progress}%` }}
                          transition={{ type: 'spring', ...springSnappy }}
                        />
                      </div>
                      <span className="text-xs text-[var(--quant-muted-foreground)] w-8 text-right">
                        {upload.status === 'complete'
                          ? '\u2713'
                          : upload.status === 'cancelled'
                            ? '\u2717'
                            : `${Math.round(upload.progress)}%`}
                      </span>
                    </div>
                  </div>
                  {upload.status === 'uploading' && (
                    <button
                      onClick={() => cancelUpload(upload.id)}
                      className="p-1 rounded-md hover:bg-[var(--quant-background)] transition-colors text-[var(--quant-muted-foreground)]"
                      aria-label={`Cancel upload of ${upload.name}`}
                    >
                      &#10005;
                    </button>
                  )}
                </motion.li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
