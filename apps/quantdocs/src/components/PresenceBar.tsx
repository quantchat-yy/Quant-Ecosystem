'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { Avatar, Badge } from '@quant/shared-ui';
import type { AwarenessUser } from '../hooks/useDocument';

interface Viewer {
  id: string;
  name: string;
  avatarUrl?: string;
  color?: string;
  isTyping?: boolean;
}

interface PresenceBarProps {
  viewers?: Viewer[];
  maxVisible?: number;
  awareness?: Map<string, AwarenessUser>;
}

const DEFAULT_MAX_VISIBLE = 3;

export function PresenceBar({
  viewers = [],
  maxVisible = DEFAULT_MAX_VISIBLE,
  awareness,
}: PresenceBarProps) {
  // Merge viewers with awareness data for typing/editing indicators
  const enrichedViewers = viewers.map((viewer) => {
    const awarenessData = awareness?.get(viewer.id);
    return {
      ...viewer,
      color: awarenessData?.color || viewer.color,
      isTyping: awarenessData?.isTyping || viewer.isTyping || false,
      cursor: awarenessData?.cursor,
    };
  });

  // Also include awareness users not in viewers list
  if (awareness) {
    awareness.forEach((user, id) => {
      if (!enrichedViewers.find((v) => v.id === id)) {
        enrichedViewers.push({
          id: user.id,
          name: user.name,
          color: user.color,
          isTyping: user.isTyping || false,
          cursor: user.cursor,
        });
      }
    });
  }

  // Apply maxVisible slicing
  const visibleViewers = enrichedViewers.slice(0, maxVisible);
  const overflowCount = enrichedViewers.length - maxVisible;

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 border-b border-[var(--quant-border)]"
      aria-label={`${enrichedViewers.length} ${enrichedViewers.length === 1 ? 'person' : 'people'} viewing`}
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
              <div
                className="rounded-full ring-2"
                style={{ ['--tw-ring-color' as string]: viewer.color || 'var(--quant-border)' }}
              >
                <Avatar
                  src={viewer.avatarUrl}
                  name={viewer.name}
                  size="xs"
                  showStatus
                  status="online"
                />
              </div>
              {/* Animated pulse indicator */}
              <motion.span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--quant-background)]"
                style={{ backgroundColor: viewer.color || '#34A853' }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              />
              {/* Typing dots indicator */}
              {viewer.isTyping && (
                <motion.div
                  className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[var(--quant-primary)] flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <span className="text-[6px] text-white">...</span>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {enrichedViewers.length > 0 && (
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
              {enrichedViewers.length} viewing
            </motion.span>
          )}
          {enrichedViewers.some((v) => v.isTyping) && (
            <span className="text-xs text-[var(--quant-primary)]">
              &middot; {enrichedViewers.filter((v) => v.isTyping).length} editing
            </span>
          )}
        </div>
      )}
    </div>
  );
}
