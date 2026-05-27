// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantMax - Group Video Rooms
// Room browser (cards with topic/participants/max 8), create room form,
// join room button, in-room 2x4 video grid, spectator count, chat panel
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface RoomParticipant {
  id: string;
  username: string;
  avatarUrl: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isHost: boolean;
  isSpeaking: boolean;
}

interface GroupRoom {
  id: string;
  topic: string;
  description: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  participants: RoomParticipant[];
  maxParticipants: number;
  spectatorCount: number;
  isPrivate: boolean;
  tags: string[];
  createdAt: string;
  status: 'active' | 'full' | 'closed';
}

interface RoomMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  isSystem: boolean;
}

interface CreateRoomForm {
  topic: string;
  description: string;
  maxParticipants: number;
  isPrivate: boolean;
  tags: string[];
}

type PageView = 'browse' | 'in_room';

const GroupRoomsPage: React.FC = () => {
  const [view, setView] = useState<PageView>('browse');
  const [rooms, setRooms] = useState<GroupRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GroupRoom | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createForm, setCreateForm] = useState<CreateRoomForm>({
    topic: '',
    description: '',
    maxParticipants: 8,
    isPrivate: false,
    tags: [],
  });
  const [tagInput, setTagInput] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);
  const [isSpectator, setIsSpectator] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(true);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (view === 'in_room' && currentRoom) {
      // Simulate incoming messages
      const interval = setInterval(
        () => {
          const sysMessages = ['joined the room', 'is now speaking', 'raised their hand'];
          const chatMessages = ['Hey everyone!', 'This is fun', 'Great topic!', 'Agree!', 'LOL'];
          const isSystem = Math.random() > 0.7;
          const newMsg: RoomMessage = {
            id: `msg-${Date.now()}`,
            userId: `user-${Math.floor(Math.random() * 10)}`,
            username: isSystem ? 'System' : `user_${Math.floor(Math.random() * 100)}`,
            text: isSystem
              ? sysMessages[Math.floor(Math.random() * sysMessages.length)]
              : chatMessages[Math.floor(Math.random() * chatMessages.length)],
            timestamp: Date.now(),
            isSystem,
          };
          setMessages((prev) => [...prev.slice(-50), newMsg]);
        },
        4000 + Math.random() * 3000,
      );

      return () => clearInterval(interval);
    }
  }, [view, currentRoom]);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const topics = [
        'Chill Vibes Only',
        'Music Lovers',
        'Study Together',
        'Game Night',
        'Philosophy Talk',
        'Travel Stories',
        'Dating Advice',
        'Career Chat',
        'Movie Fans',
        'Cooking Club',
      ];
      const mockRooms: GroupRoom[] = Array.from({ length: 10 }, (_, i) => {
        const participantCount = Math.floor(Math.random() * 7) + 2;
        return {
          id: `room-${i}`,
          topic: topics[i],
          description: `Join us for a ${topics[i].toLowerCase()} session!`,
          hostId: `host-${i}`,
          hostName: `Host${i + 1}`,
          hostAvatar: `https://cdn.quantmax.app/rooms/hosts/${i}.jpg`,
          participants: Array.from({ length: participantCount }, (_, j) => ({
            id: `participant-${i}-${j}`,
            username: j === 0 ? `Host${i + 1}` : `user_${i * 10 + j}`,
            avatarUrl: `https://cdn.quantmax.app/rooms/participants/${i}/${j}.jpg`,
            isMuted: Math.random() > 0.5,
            isCameraOff: Math.random() > 0.7,
            isHost: j === 0,
            isSpeaking: Math.random() > 0.8,
          })),
          maxParticipants: 8,
          spectatorCount: Math.floor(Math.random() * 50),
          isPrivate: i === 4 || i === 8,
          tags: ['fun', 'social', 'casual', 'serious', 'creative']
            .sort(() => Math.random() - 0.5)
            .slice(0, 2),
          createdAt: `${Math.floor(Math.random() * 60) + 5} min ago`,
          status: participantCount >= 8 ? 'full' : 'active',
        };
      });
      setRooms(mockRooms);
    } catch (err) {
      setError('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleJoinRoom = useCallback((room: GroupRoom) => {
    if (room.participants.length >= room.maxParticipants) {
      setIsSpectator(true);
    } else {
      setIsSpectator(false);
    }
    setCurrentRoom(room);
    setView('in_room');
    setMessages([
      {
        id: 'welcome',
        userId: 'system',
        username: 'System',
        text: `You joined "${room.topic}"`,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    setView('browse');
    setCurrentRoom(null);
    setMessages([]);
    setIsSpectator(false);
  }, []);

  const handleCreateRoom = useCallback(() => {
    if (!createForm.topic.trim()) return;
    const newRoom: GroupRoom = {
      id: `room-new-${Date.now()}`,
      topic: createForm.topic,
      description: createForm.description,
      hostId: 'me',
      hostName: 'You',
      hostAvatar: '',
      participants: [
        {
          id: 'me',
          username: 'You',
          avatarUrl: '',
          isMuted: false,
          isCameraOff: false,
          isHost: true,
          isSpeaking: false,
        },
      ],
      maxParticipants: createForm.maxParticipants,
      spectatorCount: 0,
      isPrivate: createForm.isPrivate,
      tags: createForm.tags,
      createdAt: 'Just now',
      status: 'active',
    };
    setCurrentRoom(newRoom);
    setView('in_room');
    setShowCreateForm(false);
    setCreateForm({ topic: '', description: '', maxParticipants: 8, isPrivate: false, tags: [] });
  }, [createForm]);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim()) return;
    const newMsg: RoomMessage = {
      id: `msg-own-${Date.now()}`,
      userId: 'me',
      username: 'You',
      text: messageInput,
      timestamp: Date.now(),
      isSystem: false,
    };
    setMessages((prev) => [...prev, newMsg]);
    setMessageInput('');
  }, [messageInput]);

  const handleAddTag = useCallback(() => {
    if (!tagInput.trim() || createForm.tags.length >= 5) return;
    setCreateForm((prev) => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
    setTagInput('');
  }, [tagInput, createForm.tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setCreateForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }, []);

  const filteredRooms = useMemo(() => {
    let result = rooms;
    if (searchQuery) {
      result = result.filter((r) => r.topic.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterTag) {
      result = result.filter((r) => r.tags.includes(filterTag));
    }
    return result;
  }, [rooms, searchQuery, filterTag]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    rooms.forEach((r) => r.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [rooms]);

  if (loading) {
    return (
      <div className="group-rooms-loading">
        <div className="loading-spinner" />
        <p>Loading rooms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="group-rooms-error">
        <p>{error}</p>
        <button className="retry-btn" onClick={loadRooms}>
          Retry
        </button>
      </div>
    );
  }

  // In Room View
  if (view === 'in_room' && currentRoom) {
    return (
      <div className="group-rooms-page in-room">
        {/* Room Header */}
        <div className="room-header">
          <button className="leave-room-btn" onClick={handleLeaveRoom}>
            &larr; Leave
          </button>
          <div className="room-title-area">
            <h2 className="room-topic">{currentRoom.topic}</h2>
            <div className="room-meta">
              <span className="participant-count">
                {currentRoom.participants.length}/{currentRoom.maxParticipants}
              </span>
              <span className="spectator-count">👁 {currentRoom.spectatorCount} watching</span>
            </div>
          </div>
        </div>

        {/* 2x4 Video Grid */}
        <div className="video-grid-2x4">
          {Array.from({ length: 8 }, (_, i) => {
            const participant = currentRoom.participants[i] || null;
            return (
              <div key={i} className={`grid-cell ${participant ? 'occupied' : 'empty'}`}>
                {participant ? (
                  <div className={`participant-video ${participant.isSpeaking ? 'speaking' : ''}`}>
                    {participant.isCameraOff ? (
                      <div className="camera-off-placeholder">
                        <img
                          className="participant-avatar"
                          src={participant.avatarUrl}
                          alt={participant.username}
                        />
                      </div>
                    ) : (
                      <div className="video-placeholder">
                        <img
                          className="participant-avatar-small"
                          src={participant.avatarUrl}
                          alt={participant.username}
                        />
                      </div>
                    )}
                    <div className="participant-label">
                      <span className="participant-name">{participant.username}</span>
                      {participant.isHost && <span className="host-badge">Host</span>}
                      {participant.isMuted && <span className="muted-icon">🔇</span>}
                    </div>
                  </div>
                ) : (
                  <div className="empty-slot">
                    <span className="empty-icon">+</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Room Controls */}
        <div className="room-controls">
          {!isSpectator && (
            <>
              <button
                className={`room-control ${isMuted ? 'off' : ''}`}
                onClick={() => setIsMuted(!isMuted)}
              >
                <span>{isMuted ? '🔇' : '🎤'}</span>
              </button>
              <button
                className={`room-control ${isCameraOff ? 'off' : ''}`}
                onClick={() => setIsCameraOff(!isCameraOff)}
              >
                <span>{isCameraOff ? '📷' : '📹'}</span>
              </button>
            </>
          )}
          <button className="room-control chat-toggle" onClick={() => setShowChat(!showChat)}>
            <span>💬</span>
          </button>
          <button className="room-control leave" onClick={handleLeaveRoom}>
            <span>Leave</span>
          </button>
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="room-chat-panel">
            <div className="room-messages">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`room-message ${msg.isSystem ? 'system' : ''} ${msg.userId === 'me' ? 'own' : ''}`}
                >
                  {!msg.isSystem && <span className="msg-username">{msg.username}:</span>}
                  <span className="msg-text">
                    {msg.isSystem ? `${msg.username} ${msg.text}` : msg.text}
                  </span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="room-chat-input">
              <input
                className="chat-input"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="send-btn" onClick={handleSendMessage}>
                Send
              </button>
            </div>
          </div>
        )}

        {isSpectator && (
          <div className="spectator-banner">
            <span>You are watching as a spectator</span>
          </div>
        )}
      </div>
    );
  }

  // Browse View
  return (
    <div className="group-rooms-page browse">
      <div className="rooms-header">
        <h1 className="page-title">Group Rooms</h1>
        <button className="create-room-btn" onClick={() => setShowCreateForm(true)}>
          + Create Room
        </button>
      </div>

      {/* Search & Filters */}
      <div className="rooms-search">
        <input
          className="search-input"
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="tag-filters">
        <button
          className={`tag-filter ${filterTag === '' ? 'active' : ''}`}
          onClick={() => setFilterTag('')}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            className={`tag-filter ${filterTag === tag ? 'active' : ''}`}
            onClick={() => setFilterTag(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Room Cards */}
      <div className="rooms-grid">
        {filteredRooms.length === 0 && (
          <div className="no-rooms">
            <p>No rooms found. Create one!</p>
          </div>
        )}
        {filteredRooms.map((room) => (
          <div key={room.id} className={`room-card ${room.status}`}>
            <div className="room-card-header">
              <h3 className="room-card-topic">{room.topic}</h3>
              {room.isPrivate && <span className="private-badge">Private</span>}
            </div>
            <p className="room-card-desc">{room.description}</p>
            <div className="room-card-host">
              <img className="host-avatar" src={room.hostAvatar} alt={room.hostName} />
              <span className="host-name">{room.hostName}</span>
            </div>
            <div className="room-card-stats">
              <span className="participants-badge">
                {room.participants.length}/{room.maxParticipants} participants
              </span>
              <span className="spectators-badge">👁 {room.spectatorCount}</span>
            </div>
            <div className="room-card-tags">
              {room.tags.map((tag) => (
                <span key={tag} className="room-tag">
                  {tag}
                </span>
              ))}
            </div>
            <div className="room-card-footer">
              <span className="room-created">{room.createdAt}</span>
              <button className="join-room-btn" onClick={() => handleJoinRoom(room)}>
                {room.status === 'full' ? 'Watch' : 'Join'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Room Form */}
      {showCreateForm && (
        <div className="create-room-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="create-room-form" onClick={(e) => e.stopPropagation()}>
            <h2>Create a Room</h2>
            <div className="form-field">
              <label>Topic</label>
              <input
                className="field-input"
                value={createForm.topic}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, topic: e.target.value }))}
                placeholder="What's this room about?"
              />
            </div>
            <div className="form-field">
              <label>Description</label>
              <textarea
                className="field-textarea"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Tell people more..."
              />
            </div>
            <div className="form-field">
              <label>Max Participants: {createForm.maxParticipants}</label>
              <input
                type="range"
                min="2"
                max="8"
                value={createForm.maxParticipants}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, maxParticipants: Number(e.target.value) }))
                }
              />
            </div>
            <div className="form-field">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={createForm.isPrivate}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, isPrivate: e.target.checked }))
                  }
                />
                Private Room (invite only)
              </label>
            </div>
            <div className="form-field">
              <label>Tags</label>
              <div className="tag-input-row">
                <input
                  className="tag-input"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="Add tag"
                />
                <button className="add-tag-btn" onClick={handleAddTag}>
                  +
                </button>
              </div>
              <div className="form-tags">
                {createForm.tags.map((tag) => (
                  <span key={tag} className="form-tag">
                    {tag} <button onClick={() => handleRemoveTag(tag)}>x</button>
                  </span>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button
                className="create-btn"
                onClick={handleCreateRoom}
                disabled={!createForm.topic.trim()}
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupRoomsPage;
