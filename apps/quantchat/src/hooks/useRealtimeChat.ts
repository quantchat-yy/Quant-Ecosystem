import { useState, useEffect, useCallback } from 'react';
import { useRealtime } from '../providers/realtime-context';
import type { RealtimeEvent } from '@quant/realtime';

interface RealtimeMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
}

interface ReadReceipt {
  messageId: string;
  userId: string;
  readAt: string;
}

export function useRealtimeChat(conversationId: string) {
  const { subscribe, publish, isConnected } = useRealtime();
  const [incomingMessages, setIncomingMessages] = useState<RealtimeMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [readReceipts, setReadReceipts] = useState<Map<string, ReadReceipt>>(new Map());

  useEffect(() => {
    if (!conversationId) return;

    const channel = `chat:${conversationId}`;

    const unsubscribe = subscribe(channel, (event: RealtimeEvent) => {
      const ev = event as RealtimeEvent & {
        type: string;
        payload?: any;
        data?: any;
        userId?: string;
        messageId?: string;
        message?: any;
      };
      const type = ev.type;

      if (type === 'message:new' || type === 'message') {
        const msg = ev.payload || ev.data || ev.message;
        if (msg) {
          setIncomingMessages((prev) => [
            ...prev,
            {
              id: msg.id || crypto.randomUUID(),
              content: msg.content || msg.message || '',
              sender: msg.sender || msg.userId || 'other',
              timestamp: msg.timestamp || new Date().toISOString(),
            },
          ]);
        }
      } else if (type === 'typing:start') {
        const userId = ev.userId || (ev.payload as any)?.userId;
        if (userId) {
          setTypingUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
        }
      } else if (type === 'typing:stop') {
        const userId = ev.userId || (ev.payload as any)?.userId;
        if (userId) {
          setTypingUsers((prev) => prev.filter((u) => u !== userId));
        }
      } else if (type === 'message:read') {
        const messageId = ev.messageId || (ev.payload as any)?.messageId;
        const userId = ev.userId || (ev.payload as any)?.userId;
        if (messageId && userId) {
          setReadReceipts((prev) => {
            const next = new Map(prev);
            next.set(messageId, {
              messageId,
              userId,
              readAt: (ev.payload as any)?.readAt || new Date().toISOString(),
            });
            return next;
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [conversationId, subscribe]);

  const sendRealtimeMessage = useCallback(
    (content: string) => {
      const channel = `chat:${conversationId}`;
      publish(channel, {
        type: 'message:new',
        content,
        timestamp: new Date().toISOString(),
      });
    },
    [conversationId, publish],
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      const channel = `chat:${conversationId}`;
      publish(channel, {
        type: isTyping ? 'typing:start' : 'typing:stop',
      });
    },
    [conversationId, publish],
  );

  const markRead = useCallback(
    (messageId: string) => {
      const channel = `chat:${conversationId}`;
      publish(channel, {
        type: 'message:read',
        messageId,
      });
    },
    [conversationId, publish],
  );

  return {
    sendRealtimeMessage,
    setTyping,
    markRead,
    typingUsers,
    incomingMessages,
    readReceipts,
    isConnected,
  };
}

export default useRealtimeChat;
