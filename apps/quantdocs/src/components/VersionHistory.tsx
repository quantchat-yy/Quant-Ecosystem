'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { Button, Avatar } from '@quant/shared-ui';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
}

interface VersionEntry {
  version: number;
  timestamp: string;
  author: string;
  authorAvatar?: string;
  diff?: DiffLine[];
}

interface VersionHistoryProps {
  versions?: VersionEntry[];
  onRestore?: (version: number) => void;
}

const MOCK_DIFF: DiffLine[] = [
  { type: 'unchanged', content: 'Introduction to the project' },
  { type: 'removed', content: 'This section needs updating with new info.' },
  { type: 'added', content: 'This section has been updated with the latest information.' },
  { type: 'unchanged', content: 'The following steps outline the process:' },
  { type: 'added', content: '1. Review the requirements document' },
  { type: 'added', content: '2. Create implementation plan' },
  { type: 'unchanged', content: 'Conclusion remains the same.' },
];

export function VersionHistory({ versions = [], onRestore }: VersionHistoryProps) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  const toggleDiff = (version: number) => {
    setExpandedVersion(expandedVersion === version ? null : version);
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', ...spring.gentle }}
      className="w-72 lg:w-80 border-l border-[var(--quant-border)] flex flex-col h-full bg-[var(--quant-background)]"
      aria-label="Version history panel"
    >
      <div className="p-3 border-b border-[var(--quant-border)]">
        <h2 className="text-sm font-semibold">Version History</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {versions.length === 0 ? (
          <p className="text-sm text-[var(--quant-muted-foreground)] text-center py-8">
            No version history available
          </p>
        ) : (
          <ol className="space-y-3" aria-label="Document versions">
            {versions.map((entry, index) => (
              <motion.li
                key={entry.version}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', ...spring.gentle, delay: index * 0.04 }}
                className="rounded-md border border-[var(--quant-border)] overflow-hidden"
              >
                <div className="flex items-center justify-between p-2 hover:bg-[var(--quant-muted)] transition-colors min-h-[44px]">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar name={entry.author} src={entry.authorAvatar} size="xs" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Version {entry.version}</p>
                      <p className="text-xs text-[var(--quant-muted-foreground)]">
                        <time dateTime={entry.timestamp}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </time>
                        {' \u2022 '}
                        {entry.author}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDiff(entry.version)}
                      aria-label={`${expandedVersion === entry.version ? 'Hide' : 'Show'} diff for version ${entry.version}`}
                      aria-expanded={expandedVersion === entry.version}
                      className="min-h-[36px] text-xs focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]"
                    >
                      Diff
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRestore?.(entry.version)}
                      aria-label={`Restore version ${entry.version}`}
                      className="min-h-[36px] text-xs focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)]"
                    >
                      Restore
                    </Button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedVersion === entry.version && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: 'spring', ...spring.gentle }}
                      className="border-t border-[var(--quant-border)] overflow-hidden"
                    >
                      <div className="p-2 text-xs font-mono space-y-0.5 bg-[var(--quant-muted)]/50">
                        {(entry.diff ?? MOCK_DIFF).map((line, lineIndex) => (
                          <div
                            key={lineIndex}
                            className={`px-2 py-0.5 rounded-sm ${
                              line.type === 'added'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                : line.type === 'removed'
                                  ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                                  : 'text-[var(--quant-muted-foreground)]'
                            }`}
                          >
                            <span aria-hidden="true">
                              {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                            </span>
                            {line.content}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            ))}
          </ol>
        )}
      </div>
    </motion.aside>
  );
}
