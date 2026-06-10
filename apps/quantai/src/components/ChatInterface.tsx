'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ConversationMessage } from '../types';

interface ChatInterfaceProps {
  messages: ConversationMessage[];
  isProcessing: boolean;
  onSend: (message: string) => void;
  onAttach: (type: string) => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-5 py-3">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-white/60"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </div>
      <span className="text-xs text-white/40 ml-2">QuantAI is thinking...</span>
    </div>
  );
}

function MessageBubble({ message, index }: { message: ConversationMessage; index: number }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-white to-zinc-400 flex items-center justify-center text-[10px]">
              Q
            </div>
            <span className="text-xs text-white/50">QuantAI</span>
          </div>
        )}

        <div
          className={`rounded-3xl px-6 py-4 text-[15px] leading-relaxed ${
            isUser
              ? 'bg-white text-black rounded-br-lg'
              : 'bg-zinc-900 text-white border border-zinc-800 rounded-bl-lg'
          }`}
        >
          {message.content}
        </div>

        {!isUser && (
          <div className="flex items-center gap-2 mt-1.5 px-1">
            <button className="text-[10px] text-white/40 hover:text-white/70 transition-colors">
              Copy
            </button>
            <button className="text-[10px] text-white/40 hover:text-white/70 transition-colors">
              Regenerate
            </button>
            <div className="text-[10px] text-emerald-400/60">+12 XP</div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ChatInterface({ messages, isProcessing, onSend, onAttach }: ChatInterfaceProps) {
  const [input, setInput] = React.useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8 space-y-1">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🧠</div>
              <h3 className="text-3xl font-semibold tracking-tight mb-3">
                What would you like to create?
              </h3>
              <p className="text-white/50">
                Ask anything. QuantAI is ready to help you build, think, and execute.
              </p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((message, index) => (
            <MessageBubble key={index} message={message} index={index} />
          ))}
        </AnimatePresence>

        {isProcessing && <TypingIndicator />}
      </div>

      {/* Input Area - Addictive Design */}
      <div className="border-t border-zinc-800 p-6 bg-zinc-950">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-3xl px-6 py-2 focus-within:border-white/30 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message QuantAI..."
              className="flex-1 bg-transparent text-lg placeholder:text-white/40 focus:outline-none py-3"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={() => onAttach('image')}
                className="w-10 h-10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
              >
                📎
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="px-8 py-3 rounded-2xl bg-white text-black font-medium disabled:opacity-40 hover:bg-white/90 active:scale-[0.985] transition-all"
              >
                Send
              </button>
            </div>
          </div>

          <div className="text-center mt-3 text-[10px] text-white/30 tracking-[1px]">
            QuantAI can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </div>
  );
}
