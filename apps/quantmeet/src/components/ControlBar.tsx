'use client';

import { motion } from 'framer-motion';
import { Button } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { ControlBarProps } from '../types/components';

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
}: ControlBarProps) {
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

      <ControlButton variant="secondary" onClick={onOpenChat} aria-label="Open chat">
        Chat
      </ControlButton>

      <ControlButton variant="secondary" onClick={onOpenTranscript} aria-label="Show participants">
        People
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
