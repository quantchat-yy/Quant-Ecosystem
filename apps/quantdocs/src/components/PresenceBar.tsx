'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { Avatar, Badge } from '@quant/shared-ui';

interface Viewer {
  id: string;
  name: string;
  avatarUrl?: string;
  color?: string;
}

interface PresenceBarProps {
  viewers?: Viewer[];
  maxVisible?: number;
}

const DEFAULT_MAX_VISIBLE = 3;

export function PresenceBar({ viewers = [], maxVisible = DEFAULT_MAX_VISIBLE }: PresenceBarProps) {
  const visibleViewers = viewers.slice(0, maxVisible);
  const overflowCount = viewers.length - maxVisible;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b border-[var(--quant-border)]"
      aria-label={`${viewers.length} ${viewers.length === 1 ? 'person' : 'people'} viewing`}
    >
      <div className="flex -space-x-2">
        <AnimatePresence>
          {visibleViewers.map((viewer) => (
            <motion.div
              key={viewer.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: 'spring', ...spring.bouncy }}
              className="relative"
            >
              <Avatar
                src={viewer.avatarUrl}
                name={viewer.name}
                size="xs"
                showStatus
                status="online"
              />
              {/* Animated pulse indicator */}
              <motion.span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--quant-background)]"
                style={{ backgroundColor: viewer.color || '#34A853' }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {viewers.length > 0 && (
        <div className="flex items-center gap-2">
          {visibleViewers.map((viewer) => (
            <motion.span
              key={viewer.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-medium"
              style={{ color: viewer.color || 'var(--quant-foreground)' }}
            >
              {viewer.name}
            </motion.span>
          ))}
          {overflowCount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', ...spring.snappy }}
            >
              <Badge variant="default">
                +{overflowCount} {overflowCount === 1 ? 'other' : 'others'} viewing
              </Badge>
            </motion.div>
          )}
          {overflowCount <= 0 && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[var(--quant-muted-foreground)]"
            >
              {viewers.length} viewing
            </motion.span>
          )}
        </div>
      )}
    </div>
  );
}
