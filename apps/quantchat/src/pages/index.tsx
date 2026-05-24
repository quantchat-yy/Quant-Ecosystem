// ============================================================================
// QuantChat - Chat List Page
// Recent conversations with unread indicators, search, and quick actions
// ============================================================================

import React, { useState, useEffect } from 'react';
import type { Conversation, ChatUser } from '../types';
import { apiClient } from '../services/api-client';

interface ChatListProps {
  currentUserId: string;
}

interface ConversationItemProps {
  conversation: Conversation;
  currentUserId: string;
  onSelect: (conversationId: string) => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, currentUserId, onSelect }) => {
  const otherParticipants = conversation.participants.filter(p => p.userId !== currentUserId);
  const displayName = conversation.name || otherParticipants.map(p => p.displayName).join(', ');
  const avatarUrl = conversation.avatarUrl || otherParticipants[0]?.avatarUrl;

  const lastMsg = conversation.lastMessage;
  const lastMessagePreview = lastMsg
    ? lastMsg.type === 'text' ? lastMsg.content : `[${lastMsg.type}]`
    : 'No messages yet';

  const timeAgo = conversation.lastActivityAt
    ? formatTimeAgo(new Date(conversation.lastActivityAt))
    : '';

  return (
    <div className="conversation-item" onClick={() => onSelect(conversation.id)} role="button" tabIndex={0}>
      <div className="conversation-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="avatar-image" />
        ) : (
          <div className="avatar-placeholder">{displayName.charAt(0).toUpperCase()}</div>
        )}
        {conversation.unreadCount > 0 && (
          <span className="unread-badge">{conversation.unreadCount}</span>
        )}
      </div>
      <div className="conversation-details">
        <div className="conversation-header">
          <span className="conversation-name">{displayName}</span>
          <span className="conversation-time">{timeAgo}</span>
        </div>
        <div className="conversation-preview">
          <span className="message-preview">{lastMessagePreview}</span>
          {conversation.isPinned && <span className="pin-icon">📌</span>}
          {conversation.isMuted && <span className="mute-icon">🔇</span>}
        </div>
      </div>
    </div>
  );
};

export const ChatListPage: React.FC<ChatListProps> = ({ currentUserId }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'groups'>('all');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoading(true);
    const response = await apiClient.getConversations();
    if (response.success && response.data) {
      setConversations(response.data);
    }
    setLoading(false);
  };

  const filteredConversations = conversations.filter(conv => {
    if (searchQuery) {
      const name = conv.name || conv.participants.map(p => p.displayName).join(' ');
      if (!name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    switch (filter) {
      case 'unread': return conv.unreadCount > 0;
      case 'groups': return conv.type === 'group';
      default: return true;
    }
  });

  const pinnedConversations = filteredConversations.filter(c => c.isPinned);
  const regularConversations = filteredConversations.filter(c => !c.isPinned);

  const handleSelectConversation = (conversationId: string) => {
    // Navigate to chat view
    window.location.hash = `/chat/${conversationId}`;
  };

  if (loading) {
    return <div className="chat-list-loading">Loading conversations...</div>;
  }

  return (
    <div className="chat-list-page">
      <header className="chat-list-header">
        <div className="header-top">
          <h1>QuantChat</h1>
          <div className="header-actions">
            <button className="action-btn" aria-label="Search">🔍</button>
            <button className="action-btn" aria-label="New chat">✏️</button>
            <button className="action-btn" aria-label="Settings">⚙️</button>
          </div>
        </div>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
          <button className={filter === 'unread' ? 'active' : ''} onClick={() => setFilter('unread')}>Unread</button>
          <button className={filter === 'groups' ? 'active' : ''} onClick={() => setFilter('groups')}>Groups</button>
        </div>
      </header>

      <main className="conversation-list">
        {pinnedConversations.length > 0 && (
          <section className="pinned-section">
            <h3>Pinned</h3>
            {pinnedConversations.map(conv => (
              <ConversationItem
                key={conv.id}
                conversation={conv}
                currentUserId={currentUserId}
                onSelect={handleSelectConversation}
              />
            ))}
          </section>
        )}

        <section className="regular-section">
          {regularConversations.map(conv => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              currentUserId={currentUserId}
              onSelect={handleSelectConversation}
            />
          ))}
        </section>

        {filteredConversations.length === 0 && (
          <div className="empty-state">
            <p>No conversations found</p>
            <button onClick={() => window.location.hash = '/new-chat'}>Start a new chat</button>
          </div>
        )}
      </main>

      <nav className="bottom-nav">
        <button className="nav-item active">💬 Chat</button>
        <button className="nav-item" onClick={() => window.location.hash = '/stories'}>📖 Stories</button>
        <button className="nav-item camera-btn" onClick={() => window.location.hash = '/camera'}>📷</button>
        <button className="nav-item" onClick={() => window.location.hash = '/discover'}>🔍 Discover</button>
        <button className="nav-item" onClick={() => window.location.hash = '/map'}>🗺️ Map</button>
      </nav>
    </div>
  );
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString();
}

export default ChatListPage;
