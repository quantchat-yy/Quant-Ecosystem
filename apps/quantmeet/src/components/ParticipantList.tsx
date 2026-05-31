'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { Participant } from '../hooks/useParticipants';

interface ParticipantListProps {
  participants: Participant[];
  hostId: string | null;
}

export function ParticipantList({ participants, hostId }: ParticipantListProps) {
  return (
    <motion.aside
      className="flex flex-col w-80 border-l border-[var(--quant-border)] bg-[var(--quant-background)] h-full"
      aria-label="Participant list"
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', ...spring.gentle }}
    >
      <div className="p-3 border-b border-[var(--quant-border)] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[var(--quant-foreground)]">Participants</h2>
        <Badge variant="default">{participants.length}</Badge>
      </div>

      <ul className="flex-1 overflow-y-auto divide-y divide-[var(--quant-border)]" role="list">
        <AnimatePresence initial={false}>
          {participants.map((participant, index) => (
            <motion.li
              key={participant.id}
              className="flex items-center gap-3 px-3 py-2.5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', ...spring.gentle, delay: index * 0.05 }}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--quant-muted)] flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-[var(--quant-foreground)]">
                  {participant.displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate text-[var(--quant-foreground)]">
                    {participant.displayName}
                  </span>
                  {participant.id === hostId && <Badge variant="primary">Host</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {!participant.audioEnabled && (
                  <span
                    className="text-red-400 text-xs"
                    aria-label={`${participant.displayName} microphone muted`}
                  >
                    &#x1F507;
                  </span>
                )}
                {!participant.videoEnabled && (
                  <span
                    className="text-red-400 text-xs"
                    aria-label={`${participant.displayName} camera off`}
                  >
                    &#x1F4F7;
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.aside>
  );
}
