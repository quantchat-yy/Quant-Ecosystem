// ============================================================================
// Shared UI - CommandPaletteUI Component
// ============================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { spring } from '@quant/brand';

export interface CommandPaletteItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  group?: string;
  action: () => void;
}

export interface CommandPaletteUIProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandPaletteItem[];
  placeholder?: string;
}

function fuzzyMatch(text: string, query: string): { matches: boolean; indices: number[] } {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) {
      indices.push(i);
      qi++;
    }
  }
  return { matches: qi === q.length, indices };
}

function HighlightedText({ text, indices }: { text: string; indices: number[] }) {
  if (indices.length === 0) return <>{text}</>;
  const chars = text.split('');
  const set = new Set(indices);
  return (
    <>
      {chars.map((char, i) =>
        set.has(i) ? (
          <span key={i} className="command-palette-highlight">
            {char}
          </span>
        ) : (
          <span key={i}>{char}</span>
        ),
      )}
    </>
  );
}

export const CommandPaletteUI: React.FC<CommandPaletteUIProps> = ({
  isOpen,
  onClose,
  commands,
  placeholder = 'Search commands...',
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Register global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    if (!query) return commands.map((cmd) => ({ cmd, indices: [] as number[] }));
    return commands
      .map((cmd) => {
        const result = fuzzyMatch(cmd.label, query);
        return { cmd, indices: result.indices, matches: result.matches };
      })
      .filter((item) => item.matches);
  }, [commands, query]);

  const groups = useMemo(() => {
    const map: Record<string, { cmd: CommandPaletteItem; indices: number[] }[]> = {};
    for (const item of filteredCommands) {
      const group = item.cmd.group || 'Commands';
      if (!map[group]) map[group] = [];
      map[group].push(item);
    }
    return map;
  }, [filteredCommands]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[activeIndex]) {
          filteredCommands[activeIndex].cmd.action();
          onClose();
        }
      }
    },
    [filteredCommands, activeIndex, onClose],
  );

  const transition = {
    type: 'spring' as const,
    ...spring.stiff,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="command-palette-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <motion.div
            className="command-palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="command-palette-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={transition}
          >
            <div className="command-palette-input-wrapper">
              <svg
                className="command-palette-search-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                width="20"
                height="20"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="command-palette-input"
                aria-label="Command search"
              />
            </div>
            <div className="command-palette-results" role="listbox" aria-label="Command results">
              {filteredCommands.length === 0 ? (
                <div className="command-palette-empty">No results found</div>
              ) : (
                Object.entries(groups).map(([group, items]) => {
                  let itemIndex = -1;
                  // Calculate the offset for this group
                  let groupOffset = 0;
                  for (const [g, gItems] of Object.entries(groups)) {
                    if (g === group) break;
                    groupOffset += gItems.length;
                  }
                  return (
                    <div key={group} className="command-palette-group">
                      <div className="command-palette-group-label">{group}</div>
                      {items.map((item) => {
                        itemIndex++;
                        const globalIndex = groupOffset + itemIndex;
                        const isActive = globalIndex === activeIndex;
                        return (
                          <button
                            key={item.cmd.id}
                            onClick={() => {
                              item.cmd.action();
                              onClose();
                            }}
                            className={`command-palette-item ${isActive ? 'command-palette-item--active' : ''}`}
                            role="option"
                            aria-selected={isActive}
                          >
                            {item.cmd.icon && (
                              <span className="command-palette-item-icon" aria-hidden="true">
                                {item.cmd.icon}
                              </span>
                            )}
                            <span className="command-palette-item-label">
                              <HighlightedText text={item.cmd.label} indices={item.indices} />
                            </span>
                            {item.cmd.shortcut && (
                              <kbd className="command-palette-item-shortcut">
                                {item.cmd.shortcut}
                              </kbd>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
            <div className="command-palette-footer">
              <span>
                <kbd>↑↓</kbd> Navigate
              </span>
              <span>
                <kbd>↵</kbd> Select
              </span>
              <span>
                <kbd>Esc</kbd> Close
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
