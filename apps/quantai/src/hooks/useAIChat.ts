// ============================================================================
// QuantAI - useAIChat Hook
// Streaming chat state, message history, context window, model switching
// ============================================================================

import { useState, useCallback, useRef, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: string;
  tokens?: number;
  latencyMs?: number;
  isStreaming?: boolean;
  attachments?: string[];
}

interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: string;
  updatedAt: string;
}

interface UseAIChatOptions {
  defaultModel?: string;
  maxContextTokens?: number;
  streamingEnabled?: boolean;
}

interface UseAIChatReturn {
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  currentModel: string;
  tokenCount: number;
  sendMessage: (content: string, attachments?: string[]) => void;
  createConversation: () => void;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  switchModel: (modelId: string) => void;
  clearMessages: () => void;
  retryLastMessage: () => void;
  stopStreaming: () => void;
}

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
  const { defaultModel = 'gpt-4', maxContextTokens = 128000, streamingEnabled = true } = options;

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string>(defaultModel);

  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chatMutation = useMutation({
    mutationFn: async ({
      message,
      conversationId,
    }: {
      message: string;
      conversationId?: string;
    }) => {
      const response = await apiClient.chat(message, conversationId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to send message');
      }
      return response.data;
    },
  });

  const activeConversation = useMemo(() => {
    if (!activeConversationId) return null;
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  const messages = useMemo(() => {
    return activeConversation?.messages || [];
  }, [activeConversation]);

  const tokenCount = useMemo(() => {
    return messages.reduce(
      (sum, msg) => sum + (msg.tokens || Math.ceil(msg.content.length / 4)),
      0,
    );
  }, [messages]);

  const createConversation = useCallback(() => {
    const newConv: ChatConversation = {
      id: `conv-${Date.now()}`,
      title: 'New Chat',
      messages: [],
      model: currentModel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setError(null);
  }, [currentModel]);

  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setError(null);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    },
    [activeConversationId],
  );

  const addMessageToConversation = useCallback(
    (message: ChatMessage) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;
          const updatedMessages = [...conv.messages, message];
          const title =
            conv.messages.length === 0 && message.role === 'user'
              ? message.content.slice(0, 40)
              : conv.title;
          return { ...conv, messages: updatedMessages, title, updatedAt: new Date().toISOString() };
        }),
      );
    },
    [activeConversationId],
  );

  const updateLastAssistantMessage = useCallback(
    (content: string, isComplete: boolean) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;
          const msgs = [...conv.messages];
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
            msgs[lastIdx] = { ...msgs[lastIdx], content, isStreaming: !isComplete };
            if (isComplete) {
              msgs[lastIdx].tokens = Math.ceil(content.length / 4);
            }
          }
          return { ...conv, messages: msgs };
        }),
      );
    },
    [activeConversationId],
  );

  const sendMessage = useCallback(
    (content: string, attachments?: string[]) => {
      if (!content.trim() || isStreaming) return;

      if (!activeConversationId) {
        createConversation();
      }

      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
        tokens: Math.ceil(content.length / 4),
        attachments,
      };
      addMessageToConversation(userMessage);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        model: currentModel,
        isStreaming: true,
      };

      setTimeout(() => {
        addMessageToConversation(assistantMessage);

        setIsStreaming(true);
        chatMutation.mutate(
          { message: content.trim(), conversationId: activeConversationId || undefined },
          {
            onSuccess: (data) => {
              const fullResponse = data?.response?.content || 'I received your message.';
              if (streamingEnabled) {
                let charIndex = 0;
                streamIntervalRef.current = setInterval(() => {
                  charIndex += Math.floor(Math.random() * 5) + 2;
                  if (charIndex >= fullResponse.length) {
                    updateLastAssistantMessage(fullResponse, true);
                    setIsStreaming(false);
                    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
                  } else {
                    updateLastAssistantMessage(fullResponse.slice(0, charIndex), false);
                  }
                }, 25);
              } else {
                updateLastAssistantMessage(fullResponse, true);
                setIsStreaming(false);
              }
            },
            onError: (err) => {
              setError(err instanceof Error ? err.message : 'Failed to get response');
              setIsStreaming(false);
              updateLastAssistantMessage('Sorry, I encountered an error.', true);
            },
          },
        );
      }, 200);
    },
    [
      activeConversationId,
      isStreaming,
      currentModel,
      streamingEnabled,
      createConversation,
      addMessageToConversation,
      updateLastAssistantMessage,
      chatMutation,
    ],
  );

  const switchModel = useCallback((modelId: string) => {
    setCurrentModel(modelId);
  }, []);

  const clearMessages = useCallback(() => {
    if (!activeConversationId) return;
    setConversations((prev) =>
      prev.map((conv) => (conv.id === activeConversationId ? { ...conv, messages: [] } : conv)),
    );
  }, [activeConversationId]);

  const retryLastMessage = useCallback(() => {
    if (!activeConversation || activeConversation.messages.length < 2) return;
    const lastUserMsg = [...activeConversation.messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id !== activeConversationId) return conv;
          const msgs = conv.messages.slice(0, -1);
          return { ...conv, messages: msgs };
        }),
      );
      setTimeout(() => sendMessage(lastUserMsg.content), 100);
    }
  }, [activeConversation, activeConversationId, sendMessage]);

  const stopStreaming = useCallback(() => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setIsStreaming(false);
    updateLastAssistantMessage(messages[messages.length - 1]?.content || '', true);
  }, [messages, updateLastAssistantMessage]);

  return {
    conversations,
    activeConversation,
    messages,
    isStreaming,
    isLoading,
    error,
    currentModel,
    tokenCount,
    sendMessage,
    createConversation,
    selectConversation,
    deleteConversation,
    switchModel,
    clearMessages,
    retryLastMessage,
    stopStreaming,
  };
}

export default useAIChat;
