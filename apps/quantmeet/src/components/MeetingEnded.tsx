'use client';

import { motion } from 'framer-motion';
import { Button } from '@quant/shared-ui';
import { spring } from '@quant/brand';

interface MeetingEndedProps {
  meetingTitle?: string;
  duration?: string;
  participantCount?: number;
  hasRecording?: boolean;
  hasTranscript?: boolean;
  onRejoin: () => void;
  onGoHome: () => void;
}

export function MeetingEnded({
  meetingTitle,
  duration,
  participantCount,
  hasRecording,
  hasTranscript,
  onRejoin,
  onGoHome,
}: MeetingEndedProps) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen p-6 text-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', ...spring.gentle }}
    >
      <div className="w-full max-w-md space-y-6">
        <motion.div
          className="text-4xl"
          aria-hidden="true"
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', ...spring.bouncy, delay: 0.2 }}
        >
          &#x1F44B;
        </motion.div>
        <motion.h1
          className="text-2xl font-bold text-[var(--quant-foreground)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Meeting Ended
        </motion.h1>
        {meetingTitle && <p className="text-[var(--quant-muted-foreground)]">{meetingTitle}</p>}

        <motion.div
          className="bg-[var(--quant-muted)] rounded-lg p-4 space-y-2 text-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {duration && (
            <div className="flex justify-between">
              <span className="text-[var(--quant-muted-foreground)]">Duration</span>
              <span className="font-medium text-[var(--quant-foreground)]">{duration}</span>
            </div>
          )}
          {participantCount !== undefined && (
            <div className="flex justify-between">
              <span className="text-[var(--quant-muted-foreground)]">Participants</span>
              <span className="font-medium text-[var(--quant-foreground)]">{participantCount}</span>
            </div>
          )}
        </motion.div>

        {(hasRecording || hasTranscript) && (
          <div className="space-y-2">
            {hasRecording && (
              <p className="text-sm text-[var(--quant-muted-foreground)]">
                Recording is being processed and will be available soon.
              </p>
            )}
            {hasTranscript && (
              <p className="text-sm text-[var(--quant-muted-foreground)]">
                Transcript is available for download.
              </p>
            )}
          </div>
        )}

        <motion.div
          className="flex flex-col sm:flex-row gap-3 justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button variant="primary" onClick={onRejoin} className="min-h-[44px]">
            Rejoin
          </Button>
          <Button variant="secondary" onClick={onGoHome} className="min-h-[44px]">
            Back to Home
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
}
