'use client';

import { Button } from '@quant/shared-ui';
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { useUploadFile } from '../hooks/useFiles';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export function UploadArea() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const uploadMutation = useUploadFile();

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setStatus('uploading');
      setProgress(0);

      try {
        for (let i = 0; i < fileArray.length; i++) {
          const formData = new FormData();
          formData.append('file', fileArray[i]);
          await uploadMutation.mutateAsync(formData);
          setProgress(((i + 1) / fileArray.length) * 100);
        }
        setStatus('success');
        setTimeout(() => setStatus('idle'), 2000);
      } catch {
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    },
    [uploadMutation],
  );

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
        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-[var(--quant-muted-foreground)] text-center"
            >
              {isDragOver ? 'Drop files here' : 'Drag and drop files here, or click Upload'}
            </motion.p>
          )}
          {status === 'uploading' && (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full space-y-2"
            >
              <p className="text-sm text-[var(--quant-foreground)] text-center">
                Uploading... {Math.round(progress)}%
              </p>
              <div className="w-full h-2 rounded-full bg-[var(--quant-muted)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[var(--quant-primary)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: 'spring', ...spring.gentle }}
                />
              </div>
            </motion.div>
          )}
          {status === 'success' && (
            <motion.p
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-[var(--quant-success)] font-medium text-center"
            >
              Upload complete!
            </motion.p>
          )}
          {status === 'error' && (
            <motion.p
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-[var(--quant-destructive)] font-medium text-center"
            >
              Upload failed. Please try again.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
