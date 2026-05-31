'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';

interface Reaction {
  id: string;
  emoji: string;
  x: number;
}

const REACTION_EMOJIS = [
  { id: 'thumbsup', emoji: '\u{1F44D}', label: 'Thumbs up' },
  { id: 'clap', emoji: '\u{1F44F}', label: 'Clap' },
  { id: 'heart', emoji: '\u2764\uFE0F', label: 'Heart' },
  { id: 'laugh', emoji: '\u{1F602}', label: 'Laugh' },
  { id: 'surprised', emoji: '\u{1F62E}', label: 'Surprised' },
];

interface ReactionsOverlayProps {
  reactions?: Reaction[];
  onSendReaction?: (emoji: string) => void;
}

export function ReactionsOverlay({
  reactions: externalReactions,
  onSendReaction,
}: ReactionsOverlayProps) {
  const [reactions, setReactions] = useState<Reaction[]>(externalReactions ?? []);

  const addReaction = useCallback(
    (emoji: string) => {
      const newReaction: Reaction = {
        id: `${Date.now()}-${Math.random()}`,
        emoji,
        x: 20 + Math.random() * 60,
      };
      setReactions((prev) => [...prev, newReaction]);
      onSendReaction?.(emoji);

      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
      }, 3000);
    },
    [onSendReaction],
  );

  return (
    <>
      {/* Floating reactions */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden" aria-hidden="true">
        <AnimatePresence>
          {reactions.map((reaction) => (
            <motion.div
              key={reaction.id}
              initial={{ opacity: 1, y: '100vh', scale: 1 }}
              animate={{ opacity: 0, y: '-20vh', scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              className="absolute text-4xl"
              style={{ left: `${reaction.x}%` }}
            >
              {reaction.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction buttons - rendered in meeting context */}
      <div className="flex items-center gap-1" role="group" aria-label="Send reaction">
        {REACTION_EMOJIS.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.85 }}
            transition={{ type: 'spring', ...spring.snappy }}
            onClick={() => addReaction(item.emoji)}
            className="p-2 rounded-full hover:bg-[var(--quant-muted)] transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center text-xl"
            aria-label={item.label}
          >
            {item.emoji}
          </motion.button>
        ))}
      </div>
    </>
  );
}
