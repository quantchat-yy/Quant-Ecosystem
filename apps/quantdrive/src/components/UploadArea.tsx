'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { FileUpload, Button } from '@quant/shared-ui';
import { useUploadFile } from '../hooks/useFiles';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'complete' | 'cancelled' | 'error';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function UploadArea() {
  const [uploads, setUploads] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const uploadMutation = useUploadFile();

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      const newUploads: UploadFile[] = fileArray.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'uploading' as const,
      }));

      setUploads((prev) => [...prev, ...newUploads]);

      // Upload each file using the mutation
      for (let i = 0; i < fileArray.length; i++) {
        const upload = newUploads[i];
        try {
          const formData = new FormData();
          formData.append('file', fileArray[i]);

          // Simulate progress while uploading
          const progressInterval = setInterval(() => {
            setUploads((prev) =>
              prev.map((u) =>
                u.id === upload.id && u.status === 'uploading'
                  ? { ...u, progress: Math.min(u.progress + Math.random() * 20, 90) }
                  : u,
              ),
            );
          }, 300);

          await uploadMutation.mutateAsync(formData);

          clearInterval(progressInterval);
          setUploads((prev) =>
            prev.map((u) => (u.id === upload.id ? { ...u, progress: 100, status: 'complete' } : u)),
          );
        } catch {
          setUploads((prev) =>
            prev.map((u) => (u.id === upload.id ? { ...u, status: 'error' } : u)),
          );
        }
      }
    },
    [uploadMutation],
  );

  const cancelUpload = useCallback((uploadId: string) => {
    setUploads((prev) =>
      prev.map((u) => (u.id === uploadId ? { ...u, status: 'cancelled', progress: 0 } : u)),
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setUploads((prev) => prev.filter((u) => u.status === 'uploading'));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        void handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFiles(e.target.files);
        e.target.value = '';
      }
    },
    [handleFiles],
  );

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
        <input
          id="drive-upload-input"
          type="file"
          multiple
          className="hidden"
          aria-hidden="true"
          onChange={handleInputChange}
        />
      </div>

      <motion.div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        animate={{
          scale: isDragOver ? 1.02 : 1,
          borderColor: isDragOver ? 'var(--quant-primary)' : 'var(--quant-border)',
        }}
        transition={{ type: 'spring', ...spring.snappy }}
        className={`relative min-h-[80px] rounded-lg border-2 border-dashed flex items-center justify-center p-4 transition-colors ${
          isDragOver
            ? 'bg-[var(--quant-primary)]/5 shadow-[0_0_0_3px_var(--quant-primary)/20]'
            : 'bg-[var(--quant-muted)]/30'
        }`}
        aria-label="Drop files to upload"
      >
        <p className="text-sm text-[var(--quant-muted-foreground)] text-center">
          {isDragOver ? 'Drop files here' : 'Drag and drop files here, or click Upload'}
        </p>
      </motion.div>

      {/* Upload progress list */}
      <AnimatePresence>
        {uploads.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', ...spring.gentle }}
            className="space-y-2"
          >
            <ul aria-label="Upload progress" className="space-y-2">
              {uploads.map((upload) => (
                <motion.li
                  key={upload.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ type: 'spring', ...spring.snappy }}
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
                                : upload.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-[var(--quant-primary)]'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${upload.progress}%` }}
                          transition={{ type: 'spring', ...spring.snappy }}
                        />
                      </div>
                      <span className="text-xs text-[var(--quant-muted-foreground)] w-8 text-right">
                        {upload.status === 'complete'
                          ? '\u2713'
                          : upload.status === 'cancelled'
                            ? '\u2717'
                            : upload.status === 'error'
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
