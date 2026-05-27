// FIXME(phase-23): replace mock with real API
'use client';

import { AppShell, TopBar, BottomNav, ChatList } from '@quant/shared-ui';
import type { ChatListItem, NavItem } from '@quant/shared-ui';

const mockConversations: ChatListItem[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    lastMessage: 'Hey! Are you coming to the event tonight?',
    timestamp: '1m ago',
    unreadCount: 2,
  },
  {
    id: '2',
    name: 'Bob Smith',
    lastMessage: 'Just sent you the files',
    timestamp: '1h ago',
    unreadCount: 0,
  },
  {
    id: '3',
    name: 'Team Chat',
    lastMessage: 'Meeting moved to 3pm',
    timestamp: '2h ago',
    unreadCount: 5,
  },
  {
    id: '4',
    name: 'David Park',
    lastMessage: 'Thanks for the help!',
    timestamp: '1d ago',
    unreadCount: 0,
  },
];

const navItems: NavItem[] = [
  { id: 'chats', label: 'Chats', icon: <span>&#128172;</span> },
  { id: 'stories', label: 'Stories', icon: <span>&#9711;</span> },
  { id: 'discover', label: 'Discover', icon: <span>&#128270;</span> },
  { id: 'profile', label: 'Profile', icon: <span>&#128100;</span> },
];

export default function ChatListPage() {
  return (
    <AppShell topBar={<TopBar title="QuantChat" />}>
      <div className="flex flex-col h-full pb-16">
        <ChatList
          items={mockConversations}
          onSelect={(id) => {
            window.location.href = `/chat/${id}`;
          }}
        />
      </div>
      <BottomNav
        items={navItems}
        activeId="chats"
        onChange={(id) => {
          console.log('Navigate to:', id);
        }}
      />
    </AppShell>
  );
}
