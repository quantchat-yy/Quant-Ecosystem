'use client';

import { AppShell, TopBar, BottomNav, ChatList } from '@quant/shared-ui';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import type { NavItem } from '@quant/shared-ui';
import { useConversations } from '../hooks/useConversations';

const navItems: NavItem[] = [
  { id: 'chats', label: 'Chats', icon: <span>&#128172;</span> },
  { id: 'stories', label: 'Stories', icon: <span>&#9711;</span> },
  { id: 'discover', label: 'Discover', icon: <span>&#128270;</span> },
  { id: 'profile', label: 'Profile', icon: <span>&#128100;</span> },
];

export default function ChatListPage() {
  const { data, isLoading, error, refetch } = useConversations();

  if (isLoading) return <LoadingState variant="skeleton" text="Loading conversations..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  const conversations = data ?? [];

  if (conversations.length === 0)
    return <EmptyState title="No conversations" description="Start a new chat to get connected" />;

  const chatItems = conversations.map((conv) => ({
    id: conv.id,
    name: conv.name || 'Chat',
    lastMessage: conv.lastMessage?.content || '',
    timestamp: conv.lastActivityAt ? new Date(conv.lastActivityAt).toLocaleString() : '',
    unreadCount: conv.unreadCount || 0,
  }));

  return (
    <AppShell topBar={<TopBar title="QuantChat" />}>
      <div className="flex flex-col h-full pb-16">
        <ChatList
          items={chatItems}
          onSelect={(id) => {
            window.location.href = `/chat/${id}`;
          }}
        />
      </div>
      <BottomNav items={navItems} activeId="chats" onChange={() => {}} />
    </AppShell>
  );
}
