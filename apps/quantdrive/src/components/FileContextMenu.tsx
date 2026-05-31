'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const springSnappy = { damping: 30, stiffness: 400, mass: 0.8 };

interface FileContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: string) => void;
  isStarred?: boolean;
}

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { id: 'open', label: 'Open', icon: '\u{1F4C2}' },
  { id: 'download', label: 'Download', icon: '\u2B07' },
  { id: 'rename', label: 'Rename', icon: '\u270F' },
  { id: 'move', label: 'Move to...', icon: '\u{1F4C1}' },
  { id: 'copy', label: 'Copy', icon: '\u{1F4CB}' },
  { id: 'star', label: 'Star', icon: '\u2B50' },
  { id: 'share', label: 'Share', icon: '\u{1F517}' },
  { id: 'trash', label: 'Move to Trash', icon: '\u{1F5D1}', danger: true },
];

export function FileContextMenu({
  open,
  x,
  y,
  onClose,
  onAction,
  isStarred,
}: FileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  const items = MENU_ITEMS.map((item) =>
    item.id === 'star' ? { ...item, label: isStarred ? 'Unstar' : 'Star' } : item,
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', ...springSnappy }}
          className="fixed z-50 min-w-[180px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-card)] shadow-lg py-1"
          style={{ left: x, top: y }}
          role="menu"
          aria-label="File actions"
        >
          {items.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', ...springSnappy, delay: index * 0.02 }}
              onClick={() => {
                onAction(item.id);
                onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors min-h-[36px] hover:bg-[var(--quant-muted)] ${
                item.danger ? 'text-[var(--quant-destructive)]' : ''
              }`}
              role="menuitem"
            >
              <span aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </motion.button>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
