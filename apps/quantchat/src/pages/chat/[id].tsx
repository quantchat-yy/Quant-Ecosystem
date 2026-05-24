// ============================================================================
// QuantChat - Chat View Page
// Individual conversation with messages, input, and real-time updates
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import type { Message, Conversation, SmartReply, MessageType } from '../../types';
import { apiClient } from '../../services/api-client';
import { wsClient } from '../../services/websocket-client';

interface ChatViewProps {
  conversationId: string;
  currentUserId: string;
}

export const ChatViewPage: React.FC<ChatViewProps> = ({ conversationId, currentUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [smartReplies, setSmartReplies] = useState<SmartReply[]>([]);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConversation();
    loadMessages();
    setupRealtimeListeners();

    return () => {
      wsClient.sendTypingStop(conversationId);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    const response = await apiClient.getConversation(conversationId);
    if (response.success && response.data) {
      setConversation(response.data);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    const response = await apiClient.getMessages(conversationId, 50);
    if (response.success && response.data) {
      setMessages(response.data.reverse());
      // Mark as read
      const unreadIds = response.data
        .filter(m => m.senderId !== currentUserId && m.status !== 'read')
        .map(m => m.id);
      if (unreadIds.length > 0) {
        apiClient.markAsRead(conversationId, unreadIds);
      }
    }
    setLoading(false);
  };

  const setupRealtimeListeners = () => {
    wsClient.onMessage((msg) => {
      if ((msg as any).conversationId === conversationId) {
        setMessages(prev => [...prev, msg as Message]);
        // Get smart replies for received messages
        if ((msg as Message).senderId !== currentUserId) {
          loadSmartReplies((msg as Message).content);
        }
      }
    });

    wsClient.onTyping((data) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        setTypingUsers(prev => {
          if (data.isTyping) return [...new Set([...prev, data.userId])];
          return prev.filter(u => u !== data.userId);
        });
      }
    });
  };

  const loadSmartReplies = async (messageText: string) => {
    const response = await apiClient.getSmartReplies(messageText);
    if (response.success && response.data) {
      setSmartReplies(response.data);
    }
  };

  const handleSendMessage = async (type: MessageType = 'text', content?: string, mediaUrl?: string) => {
    const text = content || inputText.trim();
    if (!text && !mediaUrl) return;

    const response = await apiClient.sendMessage({
      conversationId,
      type,
      content: text,
      mediaUrl,
      replyTo: replyingTo?.id,
    });

    if (response.success && response.data) {
      setMessages(prev => [...prev, response.data!]);
      setInputText('');
      setReplyingTo(null);
      setSmartReplies([]);
      wsClient.sendTypingStop(conversationId);
    }
  };

  const handleInputChange = (value: string) => {
    setInputText(value);

    // Send typing indicator
    wsClient.sendTypingStart(conversationId);

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      wsClient.sendTypingStop(conversationId);
    }, 3000);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await apiClient.addReaction(messageId, emoji);
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        return {
          ...m,
          reactions: [...m.reactions.filter(r => r.userId !== currentUserId), { userId: currentUserId, emoji, timestamp: new Date() }],
        };
      }
      return m;
    }));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const otherParticipants = conversation?.participants.filter(p => p.userId !== currentUserId) || [];
  const chatTitle = conversation?.name || otherParticipants.map(p => p.displayName).join(', ');

  return (
    <div className="chat-view-page">
      <header className="chat-header">
        <button className="back-btn" onClick={() => window.location.hash = '/'}>&#8592;</button>
        <div className="chat-info">
          <h2>{chatTitle}</h2>
          {typingUsers.length > 0 && (
            <span className="typing-indicator">
              {typingUsers.length === 1 ? 'typing...' : `${typingUsers.length} people typing...`}
            </span>
          )}
        </div>
        <div className="chat-actions">
          <button onClick={() => apiClient.initiateCall({ participantIds: otherParticipants.map(p => p.userId), type: 'voice' })}>📞</button>
          <button onClick={() => apiClient.initiateCall({ participantIds: otherParticipants.map(p => p.userId), type: 'video' })}>📹</button>
          <button>⋮</button>
        </div>
      </header>

      <main className="messages-container">
        {loading ? (
          <div className="loading">Loading messages...</div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`message-wrapper ${msg.senderId === currentUserId ? 'sent' : 'received'}`}
              >
                {msg.replyTo && (
                  <div className="reply-context">
                    Replying to a message
                  </div>
                )}
                <div className="message-bubble">
                  {msg.type === 'text' && <p>{msg.content}</p>}
                  {msg.type === 'image' && <img src={msg.mediaUrl} alt="Shared image" className="media-content" />}
                  {msg.type === 'video' && <video src={msg.mediaUrl} controls className="media-content" />}
                  {msg.type === 'voice' && <audio src={msg.mediaUrl} controls className="voice-message" />}

                  <div className="message-meta">
                    <span className="message-time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.isEdited && <span className="edited-badge">edited</span>}
                    {msg.senderId === currentUserId && (
                      <span className="message-status">{getStatusIcon(msg.status)}</span>
                    )}
                  </div>
                </div>

                {msg.reactions.length > 0 && (
                  <div className="reactions-bar">
                    {msg.reactions.map((r, i) => (
                      <span key={i} className="reaction">{r.emoji}</span>
                    ))}
                  </div>
                )}

                <div className="message-actions">
                  <button onClick={() => handleReaction(msg.id, '❤️')}>❤️</button>
                  <button onClick={() => handleReaction(msg.id, '😂')}>😂</button>
                  <button onClick={() => setReplyingTo(msg)}>↩️</button>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </main>

      {smartReplies.length > 0 && (
        <div className="smart-replies">
          {smartReplies.map(reply => (
            <button
              key={reply.id}
              className="smart-reply-chip"
              onClick={() => handleSendMessage('text', reply.text)}
            >
              {reply.text}
            </button>
          ))}
        </div>
      )}

      {replyingTo && (
        <div className="reply-preview">
          <span>Replying to: {replyingTo.content.slice(0, 50)}</span>
          <button onClick={() => setReplyingTo(null)}>✕</button>
        </div>
      )}

      <footer className="message-input-bar">
        <button className="media-btn" onClick={() => setShowMediaOptions(!showMediaOptions)}>+</button>
        <input
          type="text"
          placeholder="Message..."
          value={inputText}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="text-input"
        />
        {inputText.trim() ? (
          <button className="send-btn" onClick={() => handleSendMessage()}>➤</button>
        ) : (
          <button className="camera-btn" onClick={() => window.location.hash = '/camera'}>📷</button>
        )}
      </footer>

      {showMediaOptions && (
        <div className="media-options">
          <button onClick={() => handleSendMessage('image', undefined, 'photo-url')}>🖼️ Photo</button>
          <button onClick={() => handleSendMessage('video', undefined, 'video-url')}>🎬 Video</button>
          <button onClick={() => handleSendMessage('voice', undefined, 'voice-url')}>🎤 Voice</button>
          <button onClick={() => handleSendMessage('location', 'Shared location')}>📍 Location</button>
          <button onClick={() => handleSendMessage('sticker', undefined, 'sticker-url')}>😀 Sticker</button>
        </div>
      )}
    </div>
  );
};

function getStatusIcon(status: string): string {
  switch (status) {
    case 'sending': return '⏳';
    case 'sent': return '✓';
    case 'delivered': return '✓✓';
    case 'read': return '✓✓';
    case 'failed': return '⚠️';
    default: return '';
  }
}

export default ChatViewPage;
