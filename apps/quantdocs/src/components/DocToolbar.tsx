'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';

interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
}

const FORMATTING_ACTIONS: ToolbarAction[] = [
  { id: 'bold', label: 'Bold', icon: 'B' },
  { id: 'italic', label: 'Italic', icon: 'I' },
  { id: 'underline', label: 'Underline', icon: 'U' },
  { id: 'strikethrough', label: 'Strikethrough', icon: 'S' },
];

const HEADING_OPTIONS: ToolbarAction[] = [
  { id: 'h1', label: 'Heading 1', icon: 'H1' },
  { id: 'h2', label: 'Heading 2', icon: 'H2' },
  { id: 'h3', label: 'Heading 3', icon: 'H3' },
  { id: 'h4', label: 'Heading 4', icon: 'H4' },
  { id: 'h5', label: 'Heading 5', icon: 'H5' },
  { id: 'h6', label: 'Heading 6', icon: 'H6' },
];

const LIST_ACTIONS: ToolbarAction[] = [
  { id: 'ordered-list', label: 'Ordered List', icon: '1.' },
  { id: 'bullet-list', label: 'Bullet List', icon: '\u2022' },
];

const BLOCK_ACTIONS: ToolbarAction[] = [
  { id: 'blockquote', label: 'Blockquote', icon: '\u201C' },
  { id: 'code-block', label: 'Code Block', icon: '</>' },
];

const INSERT_ACTIONS: ToolbarAction[] = [
  { id: 'link', label: 'Insert Link', icon: '\u{1F517}' },
  { id: 'image', label: 'Insert Image', icon: '\u{1F5BC}' },
  { id: 'table', label: 'Insert Table', icon: '\u{1F4CA}' },
];

const TEXT_COLORS = ['#000000', '#FF0000', '#0066FF', '#00CC00', '#FF6600', '#8E24AA', '#795548'];
const HIGHLIGHT_COLORS = [
  'transparent',
  '#FFFF00',
  '#00FFFF',
  '#FF69B4',
  '#90EE90',
  '#FFA500',
  '#E6E6FA',
];

interface DocToolbarProps {
  onAction?: (actionId: string, value?: string) => void;
}

export function DocToolbar({ onAction }: DocToolbarProps) {
  const [showHeadings, setShowHeadings] = useState(false);
  const [showTextColor, setShowTextColor] = useState(false);
  const [showHighlight, setShowHighlight] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', ...spring.snappy }}
      className="flex flex-wrap items-center gap-1 p-2 border-b border-[var(--quant-border)] bg-[var(--quant-muted)]"
      role="toolbar"
      aria-label="Document formatting toolbar"
    >
      {/* Headings Dropdown */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', ...spring.snappy }}
          onClick={() => {
            setShowHeadings(!showHeadings);
            setShowTextColor(false);
            setShowHighlight(false);
          }}
          aria-label="Headings"
          aria-expanded={showHeadings}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-xs font-mono hover:bg-[var(--quant-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] transition-colors"
        >
          H&#x25BE;
        </motion.button>
        <AnimatePresence>
          {showHeadings && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', ...spring.snappy }}
              className="absolute top-full left-0 z-20 mt-1 bg-[var(--quant-card)] border border-[var(--quant-border)] rounded-md shadow-lg py-1 min-w-[120px]"
            >
              {HEADING_OPTIONS.map((h) => (
                <button
                  key={h.id}
                  onClick={() => {
                    onAction?.(h.id);
                    setShowHeadings(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--quant-muted)] transition-colors"
                  aria-label={h.label}
                >
                  {h.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ToolbarSeparator />
      <ToolbarGroup actions={FORMATTING_ACTIONS} onAction={onAction} />
      <ToolbarSeparator />
      <ToolbarGroup actions={LIST_ACTIONS} onAction={onAction} />
      <ToolbarSeparator />
      <ToolbarGroup actions={BLOCK_ACTIONS} onAction={onAction} />
      <ToolbarSeparator />
      <ToolbarGroup actions={INSERT_ACTIONS} onAction={onAction} />
      <ToolbarSeparator />

      {/* Text Color */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', ...spring.snappy }}
          onClick={() => {
            setShowTextColor(!showTextColor);
            setShowHighlight(false);
            setShowHeadings(false);
          }}
          aria-label="Text color"
          aria-expanded={showTextColor}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-xs font-bold hover:bg-[var(--quant-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] transition-colors"
        >
          A<span className="block w-4 h-1 bg-current rounded-sm" aria-hidden="true" />
        </motion.button>
        <AnimatePresence>
          {showTextColor && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', ...spring.snappy }}
              className="absolute top-full left-0 z-20 mt-1 bg-[var(--quant-card)] border border-[var(--quant-border)] rounded-md shadow-lg p-2 flex gap-1"
            >
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onAction?.('text-color', color);
                    setShowTextColor(false);
                  }}
                  className="w-6 h-6 rounded-sm border border-[var(--quant-border)]"
                  style={{ backgroundColor: color }}
                  aria-label={`Text color ${color}`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Highlight Color */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', ...spring.snappy }}
          onClick={() => {
            setShowHighlight(!showHighlight);
            setShowTextColor(false);
            setShowHeadings(false);
          }}
          aria-label="Highlight color"
          aria-expanded={showHighlight}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-xs hover:bg-[var(--quant-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] transition-colors"
        >
          <span className="px-1 bg-yellow-200 rounded-sm font-bold">A</span>
        </motion.button>
        <AnimatePresence>
          {showHighlight && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', ...spring.snappy }}
              className="absolute top-full left-0 z-20 mt-1 bg-[var(--quant-card)] border border-[var(--quant-border)] rounded-md shadow-lg p-2 flex gap-1"
            >
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onAction?.('highlight', color);
                    setShowHighlight(false);
                  }}
                  className="w-6 h-6 rounded-sm border border-[var(--quant-border)]"
                  style={{ backgroundColor: color === 'transparent' ? 'white' : color }}
                  aria-label={`Highlight ${color === 'transparent' ? 'none' : color}`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-6 bg-[var(--quant-border)] mx-1" aria-hidden="true" />;
}

function ToolbarGroup({
  actions,
  onAction,
}: {
  actions: ToolbarAction[];
  onAction?: (actionId: string, value?: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {actions.map((action) => (
        <motion.button
          key={action.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', ...spring.snappy }}
          onClick={() => onAction?.(action.id)}
          aria-label={action.label}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-xs font-mono hover:bg-[var(--quant-background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-ring)] transition-colors"
        >
          {action.icon}
        </motion.button>
      ))}
    </div>
  );
}
