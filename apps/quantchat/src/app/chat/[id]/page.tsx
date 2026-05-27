'use client';

import { use } from 'react';
import { ChatBubble, ChatInput, TypingIndicator, TopBar } from '@quant/shared-ui';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useMessages } from '../../../hooks/useMessages';
import { useSendMessage } from '../../../hooks/useSendMessage';

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading, error, refetch } = useMessages(id);
  const sendMessage = useSendMessage();

  if (isLoading) return <LoadingState variant="skeleton" text="Loading messages..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  const messages = data ?? [];

  return (
    <div className="flex flex-col h-screen">
      <TopBar
        title={`Chat ${id}`}
        onBack={() => {
          window.location.href = '/';
        }}
      />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <EmptyState
            title="No messages yet"
            description="Send a message to start the conversation"
          />
        ) : (
          messages.map(
            (msg: {
              id: string;
              message?: string;
              content?: string;
              sender?: string;
              role?: string;
              timestamp?: string;
            }) => (
              <ChatBubble
                key={msg.id}
                message={msg.message ?? msg.content ?? ''}
                sender={(msg.sender ?? msg.role ?? 'other') as 'self' | 'other'}
                timestamp={msg.timestamp ?? ''}
              />
            ),
          )
        )}
        <TypingIndicator users={[]} />
      </div>
      <ChatInput
        onSend={(content) => {
          sendMessage.mutate({ conversationId: id, content, type: 'text' as const });
        }}
        placeholder="Type a message..."
      />
    </div>
  );
}
