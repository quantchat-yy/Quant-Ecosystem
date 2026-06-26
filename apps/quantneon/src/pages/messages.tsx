// ============================================================================
// QuantNeon - Direct Messages
// Real DM inbox wired to the /dm backend (conversations, messages, unread,
// read receipts). "me" is resolved via /profiles/me so message ownership and
// the "other participant" of a 1:1 render correctly.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageTransition } from '@quant/shared-ui';
import {
  apiClient,
  type DmConversationSummary,
  type DmMessage,
  type DmParticipant,
} from '../services/api-client';

interface MessagesPageState {
  myId: string | null;
  conversations: DmConversationSummary[];
  activeConversation: DmConversationSummary | null;
  messages: DmMessage[];
  inputText: string;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  sending: boolean;
}

/** The display participant for a conversation: the other member of a 1:1, else the first. */
function otherParticipant(conv: DmConversationSummary, myId: string | null): DmParticipant | null {
  const others = conv.participants.filter((p) => p.id !== myId);
  return others[0] ?? conv.participants[0] ?? null;
}

function titleFor(conv: DmConversationSummary, myId: string | null): string {
  if (conv.isGroup) return conv.name ?? 'Group';
  const other = otherParticipant(conv, myId);
  return other?.displayName || other?.username || 'Conversation';
}

function timeLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const MessagesPage: React.FC = () => {
  const [state, setState] = useState<MessagesPageState>({
    myId: null,
    conversations: [],
    activeConversation: null,
    messages: [],
    inputText: '',
    loading: true,
    error: null,
    searchQuery: '',
    sending: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const [meRes, convRes] = await Promise.all([
          apiClient.getMe(),
          apiClient.listConversations(),
        ]);
        setState((prev) => ({
          ...prev,
          myId: meRes.success ? (meRes.data?.profile.id ?? null) : null,
          conversations: convRes.success ? (convRes.data ?? []) : [],
          loading: false,
          error: convRes.success ? null : (convRes.error?.message ?? 'Failed to load messages'),
        }));
      } catch {
        setState((prev) => ({ ...prev, error: 'Failed to load messages', loading: false }));
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  const selectConversation = useCallback(async (conv: DmConversationSummary) => {
    setState((prev) => ({ ...prev, activeConversation: conv, messages: [] }));
    const res = await apiClient.getDmMessages(conv.id);
    setState((prev) => ({
      ...prev,
      messages: res.success ? (res.data ?? []) : [],
      // Optimistically clear the unread badge for the opened conversation.
      conversations: prev.conversations.map((c) =>
        c.id === conv.id ? { ...c, unreadCount: 0 } : c,
      ),
    }));
    void apiClient.markDmRead(conv.id);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = state.inputText.trim();
    const conv = state.activeConversation;
    if (!text || !conv || state.sending) return;
    setState((prev) => ({ ...prev, sending: true, inputText: '' }));
    const res = await apiClient.sendDmMessage(conv.id, text);
    setState((prev) => ({
      ...prev,
      sending: false,
      messages: res.success && res.data ? [...prev.messages, res.data] : prev.messages,
    }));
  }, [state.inputText, state.activeConversation, state.sending]);

  const visibleConversations = state.conversations.filter((c) => {
    if (!state.searchQuery.trim()) return true;
    return titleFor(c, state.myId).toLowerCase().includes(state.searchQuery.toLowerCase());
  });

  if (state.loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen bg-black dark:bg-[#0F0F14]">
          <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  if (state.error) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen bg-black dark:bg-[#0F0F14]">
          <div className="text-center space-y-3">
            <p className="text-white">{state.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-4 py-2 bg-pink-600 text-white rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-black dark:bg-[#0F0F14] text-white">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-800">
            <h1 className="text-xl font-bold mb-3">Messages</h1>
            <input
              type="text"
              value={state.searchQuery}
              onChange={(e) => setState((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Search messages..."
              className="w-full h-11 bg-gray-900 dark:bg-gray-800 text-white rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {visibleConversations.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No conversations yet
              </div>
            )}
            {visibleConversations.map((conv) => {
              const other = otherParticipant(conv, state.myId);
              return (
                <div
                  key={conv.id}
                  onClick={() => void selectConversation(conv)}
                  className={`flex items-center space-x-3 px-4 py-3 cursor-pointer hover:bg-gray-900 dark:hover:bg-gray-800 ${state.activeConversation?.id === conv.id ? 'bg-gray-900 dark:bg-gray-800' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center text-sm font-semibold">
                    {other?.avatarUrl ? (
                      <img src={other.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (titleFor(conv, state.myId)[0] ?? '?').toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold truncate">
                        {titleFor(conv, state.myId)}
                      </span>
                      <span className="text-xs text-gray-500">{timeLabel(conv.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs truncate ${conv.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-500'}`}
                      >
                        {conv.lastMessage?.content ?? 'No messages yet'}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-pink-600 rounded-full text-xs flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {state.activeConversation ? (
            <>
              <div className="flex items-center px-4 py-3 border-b border-gray-800">
                <p className="text-sm font-semibold">
                  {titleFor(state.activeConversation, state.myId)}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {state.messages.map((msg) => {
                  const mine = msg.senderId === state.myId;
                  return (
                    <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-xs px-4 py-2 rounded-2xl ${mine ? 'bg-pink-600 text-white' : 'bg-gray-800 text-white'}`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs opacity-60 mt-1">{timeLabel(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="px-4 py-3 border-t border-gray-800 flex items-center space-x-3">
                <input
                  type="text"
                  value={state.inputText}
                  onChange={(e) => setState((prev) => ({ ...prev, inputText: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && void sendMessage()}
                  placeholder="Message..."
                  className="flex-1 h-11 bg-gray-900 dark:bg-gray-800 text-white rounded-full px-4 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                />
                {state.inputText.trim() && (
                  <button
                    onClick={() => void sendMessage()}
                    disabled={state.sending}
                    className="text-pink-500 font-semibold text-sm disabled:opacity-50"
                  >
                    Send
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-5xl mb-4">💬</div>
                <p className="text-white text-lg font-semibold">Your Messages</p>
                <p className="text-gray-400 text-sm mt-1">
                  Select a conversation to start chatting
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default MessagesPage;
