'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import { Button } from '@quant/shared-ui';

type AnnotationTool = 'pen' | 'highlighter' | 'text' | 'arrow' | 'rectangle' | 'eraser';

const ANNOTATION_TOOLS: { id: AnnotationTool; label: string; icon: string }[] = [
  { id: 'pen', label: 'Pen', icon: '\u270F' },
  { id: 'highlighter', label: 'Highlighter', icon: '\u{1F58C}' },
  { id: 'text', label: 'Text Box', icon: 'T' },
  { id: 'arrow', label: 'Arrow', icon: '\u2197' },
  { id: 'rectangle', label: 'Rectangle', icon: '\u25A1' },
  { id: 'eraser', label: 'Eraser', icon: '\u{1F9F9}' },
];

const ANNOTATION_COLORS = ['#FF0000', '#0066FF', '#00CC00', '#FFD700', '#FF6600', '#FFFFFF'];

interface ScreenShareOverlayProps {
  isPresenter?: boolean;
  isPaused?: boolean;
  onPauseShare?: () => void;
  onResumeShare?: () => void;
  onStopShare?: () => void;
}

export function ScreenShareOverlay({
  isPresenter = true,
  isPaused = false,
  onPauseShare,
  onResumeShare,
  onStopShare,
}: ScreenShareOverlayProps) {
  const [activeTool, setActiveTool] = useState<AnnotationTool | null>(null);
  const [activeColor, setActiveColor] = useState('#FF0000');

  if (!isPresenter) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', ...spring.snappy }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 rounded-xl bg-[var(--quant-card)]/95 backdrop-blur-sm border border-[var(--quant-border)] shadow-lg"
      role="toolbar"
      aria-label="Screen share annotation toolbar"
    >
      {/* Annotation tools */}
      <div className="flex items-center gap-1 border-r border-[var(--quant-border)] pr-2">
        {ANNOTATION_TOOLS.map((tool) => (
          <motion.button
            key={tool.id}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', ...spring.snappy }}
            onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}
            className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded-md text-sm transition-colors ${
              activeTool === tool.id
                ? 'bg-[var(--quant-primary)] text-white'
                : 'hover:bg-[var(--quant-muted)]'
            }`}
            aria-label={tool.label}
            aria-pressed={activeTool === tool.id}
          >
            {tool.icon}
          </motion.button>
        ))}
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-1 border-r border-[var(--quant-border)] pr-2">
        {ANNOTATION_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${
              activeColor === color
                ? 'border-[var(--quant-foreground)] scale-125'
                : 'border-transparent'
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Color ${color}`}
            aria-pressed={activeColor === color}
          />
        ))}
      </div>

      {/* Presenter controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          onClick={isPaused ? onResumeShare : onPauseShare}
          aria-label={isPaused ? 'Resume share' : 'Pause share'}
          className="min-h-[36px] text-xs"
        >
          {isPaused ? 'Resume' : 'Pause'}
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={onStopShare}
          aria-label="Stop sharing"
          className="min-h-[36px] text-xs bg-[var(--quant-destructive)] hover:bg-[var(--quant-destructive)]/90 text-white"
        >
          Stop Share
        </Button>
      </div>
    </motion.div>
  );
}
