'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Input } from '@quant/shared-ui';
import { spring } from '@quant/brand';
import type { ChatPanelProps } from '../types/components';

export function ChatPanel({ messages, onSendMessage, participantId }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (draft.trim()) {
      onSendMessage(draft.trim());
      setDraft('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <motion.aside
      className="flex flex-col w-80 border-l border-[var(--quant-border)] bg-[var(--quant-background)] h-full"
      aria-label="Meeting chat"
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', ...spring.gentle }}
    >
      <div className="p-3 border-b border-[var(--quant-border)]">
        <h2 className="text-sm font-semibold">Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3" role="log" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            const isOwn = msg.participantId === participantId;
            return (
              <motion.div
                key={msg.id}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', ...spring.gentle, delay: index * 0.02 }}
              >
                <span className="text-xs text-[var(--quant-muted-foreground)]">
                  {msg.displayName}
                </span>
                <div
                  className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                    isOwn
                      ? 'bg-[var(--brand-app-color)] text-white'
                      : 'bg-[var(--quant-muted)] text-[var(--quant-foreground)]'
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-[var(--quant-muted-foreground)] mt-0.5">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-[var(--quant-border)]">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            aria-label="Chat message input"
          />
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={!draft.trim()}
            aria-label="Send message"
            className="min-w-[44px] min-h-[44px]"
          >
            Send
          </Button>
        </div>
      </div>
    </motion.aside>
  );
}
