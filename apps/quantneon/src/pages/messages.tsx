// ============================================================================
// QuantNeon - Direct Messages (real, Prisma-backed)
// Conversation inbox + 1:1 thread, wired end-to-end via the DM API.
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { PageTransition } from '@quant/shared-ui';
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useMarkConversationRead,
} from '../hooks/useDirectMessages';

const MessagesPage: React.FC = () => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading, error, refetch } = useConversations();
  const { data: messages = [] } = useConversationMessages(activeId);
  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.participant?.username.toLowerCase().includes(q));
  }, [conversations, searchQuery]);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectConversation = useCallback(
    (id: string) => {
      setActiveId(id);
      markRead.mutate(id);
    },
    [markRead],
  );

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || !activeId) return;
    setInputText('');
    sendMessage.mutate({ conversationId: activeId, text });
  }, [inputText, activeId, sendMessage]);

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen bg-black dark:bg-[#0F0F14]">
          <div className="w-10 h-10 border-[3px] border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen bg-black dark:bg-[#0F0F14]">
          <div className="text-center space-y-3">
            <p className="text-white">Failed to load messages</p>
            <button
              onClick={() => void refetch()}
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-full h-11 bg-gray-900 dark:bg-gray-800 text-white rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No conversations yet</div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-900 dark:hover:bg-gray-800 ${
                    activeId === conv.id ? 'bg-gray-900 dark:bg-gray-800' : ''
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                    {conv.participant?.avatarUrl ? (
                      <img
                        src={conv.participant.avatarUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">
                        {(conv.participant?.username ?? '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold truncate">
                        {conv.participant?.username ?? 'Unknown'}
                      </span>
                      <span className="text-xs text-gray-500">{fmtTime(conv.lastMessageAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs truncate ${
                          conv.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-500'
                        }`}
                      >
                        {conv.lastMessage ?? 'Start the conversation'}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-pink-600 rounded-full text-xs flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeConversation ? (
            <>
              <div className="flex items-center space-x-3 px-4 py-3 border-b border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden">
                  {activeConversation.participant?.avatarUrl ? (
                    <img
                      src={activeConversation.participant.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">
                      {(activeConversation.participant?.username ?? '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold">
                  {activeConversation.participant?.username ?? 'Unknown'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    Say hi 👋
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-2xl ${
                          msg.isMine ? 'bg-pink-600 text-white' : 'bg-gray-800 text-white'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.content}</p>
                        <p className="text-xs opacity-60 mt-1">{fmtTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="px-4 py-3 border-t border-gray-800 flex items-center space-x-3">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Message..."
                  className="flex-1 h-11 bg-gray-900 dark:bg-gray-800 text-white rounded-full px-4 text-sm outline-none focus:ring-2 focus:ring-pink-500"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sendMessage.isPending}
                  className="text-pink-500 font-semibold text-sm disabled:opacity-40"
                >
                  Send
                </button>
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
