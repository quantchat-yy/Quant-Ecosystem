// ============================================================================
// QuantChat - ChatBubble Component
// Message bubble with status indicators, reactions, and contextual actions
// ============================================================================

import React, { useState } from 'react';
import type { Message, MessageReaction } from '../types';

interface ChatBubbleProps {
  message: Message;
  isSent: boolean;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (messageId: string) => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message, isSent, onReaction, onReply, onEdit, onDelete, onPin,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const handleLongPress = () => {
    setShowActions(true);
  };

  const handleEdit = () => {
    if (editText.trim() && editText !== message.content) {
      onEdit(message.id, editText);
    }
    setIsEditing(false);
  };

  const getStatusIcon = (): string => {
    switch (message.status) {
      case 'sending': return '⏳';
      case 'sent': return '✓';
      case 'delivered': return '✓✓';
      case 'read': return '✓✓';
      case 'failed': return '⚠️';
      default: return '';
    }
  };

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="edit-container">
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
            autoFocus
          />
          <div className="edit-actions">
            <button onClick={handleEdit}>Save</button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </div>
      );
    }

    switch (message.type) {
      case 'text':
        return <p className="message-text">{message.content}</p>;
      case 'image':
        return (
          <div className="media-message">
            <img src={message.mediaUrl} alt="Shared" className="message-image" />
            {message.content && <p className="media-caption">{message.content}</p>}
          </div>
        );
      case 'video':
        return (
          <div className="media-message">
            <video src={message.mediaUrl} controls className="message-video" />
            {message.content && <p className="media-caption">{message.content}</p>}
          </div>
        );
      case 'voice':
        return (
          <div className="voice-message">
            <button className="play-btn">▶️</button>
            <div className="waveform" />
            <span className="duration">{message.mediaMetadata?.duration || 0}s</span>
          </div>
        );
      case 'sticker':
        return <img src={message.mediaUrl} alt="Sticker" className="sticker-message" />;
      case 'location':
        return (
          <div className="location-message">
            <span className="location-icon">📍</span>
            <span>{message.content}</span>
          </div>
        );
      default:
        return <p>{message.content}</p>;
    }
  };

  return (
    <div
      className={`chat-bubble ${isSent ? 'sent' : 'received'} ${message.isPinned ? 'pinned' : ''}`}
      onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
    >
      {message.isPinned && <div className="pin-indicator">📌 Pinned</div>}

      {message.replyTo && (
        <div className="reply-reference">
          <div className="reply-bar" />
          <span className="reply-text">Reply to message</span>
        </div>
      )}

      <div className="bubble-content">
        {renderContent()}
      </div>

      <div className="bubble-footer">
        {message.isEdited && <span className="edited-label">edited</span>}
        <span className="message-time">{formatTime(message.createdAt)}</span>
        {isSent && <span className={`status-icon ${message.status}`}>{getStatusIcon()}</span>}
        {message.disappearMode !== 'off' && <span className="disappear-icon">⏱️</span>}
      </div>

      {/* Reactions */}
      {message.reactions.length > 0 && (
        <div className="reactions-container">
          {groupReactions(message.reactions).map(([emoji, count]) => (
            <button
              key={emoji}
              className="reaction-chip"
              onClick={() => onReaction(message.id, emoji)}
            >
              {emoji} {count > 1 ? count : ''}
            </button>
          ))}
        </div>
      )}

      {/* Quick Reactions */}
      {showActions && (
        <div className="actions-overlay" onClick={() => setShowActions(false)}>
          <div className="quick-reactions">
            {['❤️', '😂', '😮', '😢', '🙏', '🔥'].map(emoji => (
              <button key={emoji} onClick={() => { onReaction(message.id, emoji); setShowActions(false); }}>
                {emoji}
              </button>
            ))}
          </div>
          <div className="message-actions-menu">
            <button onClick={() => { onReply(message); setShowActions(false); }}>Reply</button>
            {isSent && <button onClick={() => { setIsEditing(true); setShowActions(false); }}>Edit</button>}
            <button onClick={() => { onPin(message.id); setShowActions(false); }}>
              {message.isPinned ? 'Unpin' : 'Pin'}
            </button>
            {isSent && <button className="danger" onClick={() => { onDelete(message.id); setShowActions(false); }}>Delete</button>}
          </div>
        </div>
      )}
    </div>
  );
};

function groupReactions(reactions: MessageReaction[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const r of reactions) {
    counts.set(r.emoji, (counts.get(r.emoji) || 0) + 1);
  }
  return Array.from(counts.entries());
}

export default ChatBubble;
