// ============================================================================
// QuantAI - Chat Interface Component
// AI chat with multi-modal input, tool calls display
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import type { ConversationMessage } from '../types';

interface ChatInterfaceProps {
  messages: ConversationMessage[];
  isProcessing: boolean;
  onSend: (message: string) => void;
  onAttach: (type: string) => void;
}

export function ChatInterface({ messages, isProcessing, onSend, onAttach }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInputValue('');
    inputRef.current?.focus();
  }, [inputValue, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <div
      className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-700"
      aria-label="Chat interface"
    >
      {/* Message List */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-label="Message history"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'
              }`}
              aria-hidden="true"
            >
              {msg.role === 'user' ? 'U' : 'AI'}
            </div>

            {/* Message Body */}
            <div
              className={`max-w-[75%] rounded-lg px-4 py-2 ${
                msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {/* Tool Call Chips */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2" aria-label="Tool calls">
                  {msg.toolCalls.map((tc) => (
                    <span
                      key={tc.id}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        tc.status === 'completed'
                          ? 'bg-green-900/50 text-green-300'
                          : tc.status === 'failed'
                            ? 'bg-red-900/50 text-red-300'
                            : tc.status === 'running'
                              ? 'bg-yellow-900/50 text-yellow-300'
                              : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {tc.name} ({tc.status})
                    </span>
                  ))}
                </div>
              )}

              {/* Attachment Chips */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2" aria-label="Attachments">
                  {msg.attachments.map((a) => (
                    <span
                      key={a.url}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <span className="block mt-1 text-xs text-gray-400">
                {msg.metadata.tokens} tokens | {msg.metadata.latency}ms
              </span>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-1 px-4 py-2" aria-label="AI is typing">
            <span
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div
        className="flex items-center gap-2 p-3 border-t border-gray-700"
        role="toolbar"
        aria-label="Message input"
      >
        <button
          type="button"
          onClick={() => onAttach('file')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          aria-label="Attach file"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => onAttach('image')}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          aria-label="Attach image"
        >
          Img
        </button>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask QuantAI anything..."
          className="flex-1 min-h-[44px] px-4 rounded-lg bg-gray-800 text-white placeholder-gray-500 border border-gray-600 focus:border-purple-500 focus:outline-none transition-colors"
          aria-label="Message input"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!inputValue.trim()}
          className="min-w-[44px] min-h-[44px] px-4 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default ChatInterface;
