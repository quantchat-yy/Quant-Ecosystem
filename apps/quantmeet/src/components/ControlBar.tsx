'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { ControlBarProps } from '../types/components';

const REACTION_EMOJIS = [
  { id: 'thumbsup', emoji: '\u{1F44D}', label: 'Thumbs up' },
  { id: 'clap', emoji: '\u{1F44F}', label: 'Clap' },
  { id: 'heart', emoji: '\u2764\uFE0F', label: 'Heart' },
  { id: 'laugh', emoji: '\u{1F602}', label: 'Laugh' },
  { id: 'surprised', emoji: '\u{1F62E}', label: 'Surprised' },
];

function ControlButton({ children, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      transition={{ type: 'spring', ...spring.snappy }}
    >
      <Button {...props} className={`min-w-[44px] min-h-[44px] ${props.className ?? ''}`}>
        {children}
      </Button>
    </motion.div>
  );
}

interface ExtendedControlBarProps extends ControlBarProps {
  onHandRaise?: () => void;
  handRaised?: boolean;
  onReaction?: (emoji: string) => void;
  onBreakoutRooms?: () => void;
  onWhiteboard?: () => void;
}

export function ControlBar({
  audioEnabled,
  videoEnabled,
  screenShareEnabled,
  recordingActive,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleRecording,
  onLeave,
  onOpenChat,
  onOpenTranscript,
  onHandRaise,
  handRaised = false,
  onReaction,
  onBreakoutRooms,
  onWhiteboard,
}: ExtendedControlBarProps) {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div
      className="flex items-center justify-center gap-2 md:gap-3 p-3 bg-[var(--quant-card)]/95 backdrop-blur-sm border-t border-[var(--quant-border)]"
      role="toolbar"
      aria-label="Meeting controls"
    >
      <ControlButton
        variant={audioEnabled ? 'secondary' : 'primary'}
        onClick={onToggleAudio}
        aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        aria-pressed={audioEnabled}
      >
        {audioEnabled ? 'Mic' : 'Muted'}
      </ControlButton>

      <ControlButton
        variant={videoEnabled ? 'secondary' : 'primary'}
        onClick={onToggleVideo}
        aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
        aria-pressed={videoEnabled}
      >
        {videoEnabled ? 'Cam' : 'Cam Off'}
      </ControlButton>

      <ControlButton
        variant={screenShareEnabled ? 'primary' : 'secondary'}
        onClick={onToggleScreenShare}
        aria-label={screenShareEnabled ? 'Stop screen share' : 'Share screen'}
        aria-pressed={screenShareEnabled}
      >
        {screenShareEnabled ? 'Sharing' : 'Share'}
      </ControlButton>

      <ControlButton
        variant={recordingActive ? 'primary' : 'secondary'}
        onClick={onToggleRecording}
        aria-label={recordingActive ? 'Stop recording' : 'Start recording'}
        aria-pressed={recordingActive}
      >
        {recordingActive ? 'Rec' : 'Record'}
      </ControlButton>

      {/* Hand Raise */}
      <motion.div
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', ...spring.snappy }}
      >
        <Button
          variant={handRaised ? 'primary' : 'secondary'}
          onClick={onHandRaise}
          aria-label={handRaised ? 'Lower hand' : 'Raise hand'}
          aria-pressed={handRaised}
          className="min-w-[44px] min-h-[44px]"
        >
          <motion.span
            animate={handRaised ? { rotate: [0, -10, 10, -10, 0] } : {}}
            transition={{ duration: 0.5, repeat: handRaised ? Infinity : 0, repeatDelay: 2 }}
          >
            {handRaised ? '\u270B' : '\u270B'}
          </motion.span>
        </Button>
      </motion.div>

      {/* Reactions */}
      <div className="relative">
        <motion.div
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', ...spring.snappy }}
        >
          <Button
            variant="secondary"
            onClick={() => setShowReactions(!showReactions)}
            aria-label="Reactions"
            aria-expanded={showReactions}
            className="min-w-[44px] min-h-[44px]"
          >
            &#x1F600;
          </Button>
        </motion.div>
        <AnimatePresence>
          {showReactions && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.9 }}
              transition={{ type: 'spring', ...spring.snappy }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex gap-1 p-2 rounded-lg bg-[var(--quant-card)] border border-[var(--quant-border)] shadow-lg"
              role="menu"
              aria-label="Reaction emojis"
            >
              {REACTION_EMOJIS.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => {
                    onReaction?.(item.emoji);
                    setShowReactions(false);
                  }}
                  className="p-1.5 rounded-md hover:bg-[var(--quant-muted)] text-xl min-w-[36px] min-h-[36px] flex items-center justify-center"
                  aria-label={item.label}
                  role="menuitem"
                >
                  {item.emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ControlButton variant="secondary" onClick={onOpenChat} aria-label="Open chat">
        Chat
      </ControlButton>

      <ControlButton variant="secondary" onClick={onOpenTranscript} aria-label="Show participants">
        People
      </ControlButton>

      {/* Breakout Rooms */}
      <ControlButton variant="secondary" onClick={onBreakoutRooms} aria-label="Breakout rooms">
        Rooms
      </ControlButton>

      {/* Whiteboard */}
      <ControlButton variant="secondary" onClick={onWhiteboard} aria-label="Open whiteboard">
        Board
      </ControlButton>

      <ControlButton
        variant="danger"
        onClick={onLeave}
        aria-label="Leave meeting"
        className="min-w-[44px] min-h-[44px] bg-[var(--quant-destructive)] hover:bg-[var(--quant-destructive)]/90 text-white"
      >
        Leave
      </ControlButton>
    </div>
  );
}
