'use client';

import { Input, Select, Button } from '@quant/shared-ui';
import type { SelectOption } from '@quant/shared-ui';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  fileName: string;
}

const PERMISSION_OPTIONS: SelectOption[] = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
];

export function ShareDialog({ open, onClose, fileName }: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('viewer');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (value: string) => {
    if (!value.trim()) {
      setEmailError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Please enter a valid email');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleShare = () => {
    if (validateEmail(email)) {
      setEmail('');
      setEmailError('');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', ...spring.gentle }}
            className="relative bg-[var(--quant-card)] rounded-xl shadow-xl border border-[var(--quant-border)] p-6 w-full max-w-md mx-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
          >
            <h2
              id="share-dialog-title"
              className="text-lg font-semibold text-[var(--quant-card-foreground)] mb-4"
            >
              Share &ldquo;{fileName}&rdquo;
            </h2>

            <div className="space-y-4">
              <p className="text-sm text-[var(--quant-muted-foreground)]">
                Add people to share this file with.
              </p>

              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <label htmlFor="share-email" className="block text-sm font-medium mb-1">
                    Email address
                  </label>
                  <Input
                    id="share-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    placeholder="name@example.com"
                    aria-label="Email address to share with"
                    aria-invalid={!!emailError}
                  />
                  {emailError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[var(--quant-destructive)] mt-1"
                    >
                      {emailError}
                    </motion.p>
                  )}
                </div>
                <div className="w-28 pt-6">
                  <Select
                    options={PERMISSION_OPTIONS}
                    value={permission}
                    onChange={(e) => setPermission(e.target.value)}
                    aria-label="Permission level"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleShare} disabled={!email.trim()}>
                  Share
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
