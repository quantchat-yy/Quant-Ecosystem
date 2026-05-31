'use client';

import { use, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChatBubble, ChatInput, TypingIndicator, TopBar } from '@quant/shared-ui';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useMessages } from '../../../hooks/useMessages';
import { useSendMessage } from '../../../hooks/useSendMessage';
import { useRealtimeChat } from '../../../hooks/useRealtimeChat';
import { messageListVariants, messageVariants } from '../../../lib/motion-variants';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useMessages(id);
  const sendMessage = useSendMessage();
  const { typingUsers, incomingMessages, isConnected, sendRealtimeMessage, setTyping, markRead } =
    useRealtimeChat(id);

  const lastMarkedRef = useRef<string | null>(null);

  const messages = useMemo(() => {
    const restMessages = data ?? [];
    const realtimeIds = new Set(incomingMessages.map((m) => m.id));
    const deduped = restMessages.filter((m: { id: string }) => !realtimeIds.has(m.id));
    return [
      ...deduped.map(
        (msg: {
          id: string;
          message?: string;
          content?: string;
          sender?: string;
          role?: string;
          timestamp?: string;
        }) => ({
          id: msg.id,
          content: msg.message ?? msg.content ?? '',
          sender: (msg.sender ?? msg.role ?? 'other') as string,
          timestamp: msg.timestamp ?? '',
          status: 'read' as const,
        }),
      ),
      ...incomingMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender,
        timestamp: msg.timestamp,
        status: 'sent' as const,
      })),
    ];
  }, [data, incomingMessages]);

  // Wire read receipts: mark latest message from others as read on mount and on new messages
  useEffect(() => {
    const otherMessages = messages.filter((m) => m.sender !== 'self');
    const latestOther = otherMessages[otherMessages.length - 1];
    if (latestOther && latestOther.id !== lastMarkedRef.current) {
      lastMarkedRef.current = latestOther.id;
      markRead(latestOther.id);
    }
  }, [messages, markRead]);

  const handleSend = useCallback(
    (content: string) => {
      // REST POST for persistence
      sendMessage.mutate({ conversationId: id, content, type: 'text' as const });
      // WS broadcast for real-time delivery
      sendRealtimeMessage(content);
      // Stop typing indicator on send
      setTyping(false);
    },
    [id, sendMessage, sendRealtimeMessage, setTyping],
  );

  const handleTyping = useCallback(
    (isTyping: boolean) => {
      setTyping(isTyping);
    },
    [setTyping],
  );

  if (isLoading) return <LoadingState variant="skeleton" text="Loading messages..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  // Connection status: green = connected, yellow = reconnecting (not connected but page is active), gray = disconnected
  const getStatusColor = () => {
    if (isConnected) return 'bg-emerald-500';
    // If not connected, treat as reconnecting (yellow) briefly
    return 'bg-yellow-500';
  };

  const getStatusLabel = () => {
    if (isConnected) return 'Online';
    return 'Reconnecting';
  };

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title={`Chat ${id}`}
        onBack={() => {
          window.location.href = '/';
        }}
        rightActions={[
          <div key="status" className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="text-xs text-[var(--quant-muted-foreground)]">{getStatusLabel()}</span>
          </div>,
        ]}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Send a message to start the conversation"
          />
        ) : (
          <motion.div
            variants={messageListVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {messages.map((msg) => (
              <motion.div key={msg.id} variants={messageVariants}>
                <ChatBubble
                  message={msg.content}
                  sender={msg.sender === 'self' ? 'self' : 'other'}
                  timestamp={msg.timestamp}
                  status={msg.status}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
        <TypingIndicator users={typingUsers} />
      </div>
      <ChatInput onSend={handleSend} onTyping={handleTyping} placeholder="Type a message..." />
    </div>
  );
}
