// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantMax - Match List
// Horizontal scrollable new matches row, conversations list with last message,
// icebreaker suggestions, unmatch menu, "It's a Match!" celebration modal
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface MatchUser {
  id: string;
  displayName: string;
  avatarUrl: string;
  age: number;
  isVerified: boolean;
  isOnline: boolean;
}

interface MatchConversation {
  id: string;
  user: MatchUser;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  isNew: boolean;
  matchedAt: string;
  compatibility: number;
  matchType: 'normal' | 'superlike' | 'boost';
}

interface IcebreakerSuggestion {
  id: string;
  text: string;
  category: 'funny' | 'flirty' | 'creative' | 'question';
}

const ICEBREAKER_SUGGESTIONS: IcebreakerSuggestion[] = [
  {
    id: '1',
    text: 'If you could have dinner with anyone, living or dead, who would it be?',
    category: 'question',
  },
  { id: '2', text: 'Whats the best trip you have ever taken?', category: 'question' },
  { id: '3', text: 'Two truths and a lie - you go first!', category: 'creative' },
  { id: '4', text: 'What is your go-to karaoke song?', category: 'funny' },
  {
    id: '5',
    text: 'If we matched on here, imagine how great our first date would be',
    category: 'flirty',
  },
  {
    id: '6',
    text: 'Your profile made me smile - what is the story behind your first photo?',
    category: 'creative',
  },
  { id: '7', text: 'Coffee or cocktails for a first date?', category: 'question' },
  {
    id: '8',
    text: 'I see you like [interest] - me too! Whats your favorite?',
    category: 'creative',
  },
];

const MatchesPage: React.FC = () => {
  const [conversations, setConversations] = useState<MatchConversation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showIcebreakers, setShowIcebreakers] = useState<boolean>(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showUnmatchMenu, setShowUnmatchMenu] = useState<string | null>(null);
  const [showMatchCelebration, setShowMatchCelebration] = useState<boolean>(false);
  const [celebrationUser, setCelebrationUser] = useState<MatchUser | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'new'>('all');
  const [confettiActive, setConfettiActive] = useState<boolean>(false);

  const newMatchesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const mockConversations: MatchConversation[] = Array.from({ length: 15 }, (_, i) => ({
        id: `match-${i}`,
        user: {
          id: `user-${i}`,
          displayName: [
            'Sophie',
            'Emma',
            'Liam',
            'Olivia',
            'Noah',
            'Ava',
            'Lucas',
            'Mia',
            'Ethan',
            'Charlotte',
          ][i % 10],
          avatarUrl: `https://cdn.quantmax.app/dating/avatars/${i}.jpg`,
          age: 22 + Math.floor(Math.random() * 10),
          isVerified: i % 3 === 0,
          isOnline: i % 2 === 0,
        },
        lastMessage:
          i < 5
            ? null
            : [
                'Hey! How are you?',
                'That sounds fun!',
                'Are you free this weekend?',
                'haha thats hilarious',
                'Good morning!',
              ][i % 5],
        lastMessageTime: i < 5 ? null : `${Math.floor(Math.random() * 24)}h ago`,
        unreadCount: i % 4 === 0 ? Math.floor(Math.random() * 5) : 0,
        isNew: i < 5,
        matchedAt: `${Math.floor(Math.random() * 7) + 1}d ago`,
        compatibility: 70 + Math.floor(Math.random() * 30),
        matchType: i % 7 === 0 ? 'superlike' : i % 5 === 0 ? 'boost' : 'normal',
      }));
      setConversations(mockConversations);
    } catch (err) {
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, []);

  const newMatches = useMemo(() => {
    return conversations.filter((c) => c.isNew);
  }, [conversations]);

  const activeConversations = useMemo(() => {
    let filtered = conversations.filter((c) => !c.isNew);
    if (searchQuery) {
      filtered = filtered.filter((c) =>
        c.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    switch (filter) {
      case 'unread':
        return filtered.filter((c) => c.unreadCount > 0);
      case 'new':
        return filtered.filter((c) => !c.lastMessage);
      default:
        return filtered;
    }
  }, [conversations, searchQuery, filter]);

  const handleOpenChat = useCallback((conversationId: string) => {
    setSelectedConversation(conversationId);
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  const handleUnmatch = useCallback((conversationId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    setShowUnmatchMenu(null);
  }, []);

  const handleSendIcebreaker = useCallback((text: string, conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: text, lastMessageTime: 'Just now', isNew: false }
          : c,
      ),
    );
    setShowIcebreakers(false);
  }, []);

  const triggerCelebration = useCallback((user: MatchUser) => {
    setCelebrationUser(user);
    setShowMatchCelebration(true);
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3000);
  }, []);

  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations]);

  if (loading) {
    return (
      <div className="matches-loading">
        <div className="loading-spinner" />
        <p>Loading your matches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="matches-error">
        <p className="error-message">{error}</p>
        <button className="retry-btn" onClick={loadMatches}>
          Retry
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="matches-empty">
        <div className="empty-icon">💝</div>
        <h2>No matches yet</h2>
        <p>Start swiping to find your match!</p>
        <button className="go-swipe-btn">Start Swiping</button>
      </div>
    );
  }

  return (
    <div className="matches-page">
      {/* Header */}
      <div className="matches-header">
        <h1 className="matches-title">Messages</h1>
        {totalUnread > 0 && <span className="total-unread-badge">{totalUnread}</span>}
      </div>

      {/* Search */}
      <div className="matches-search">
        <input
          className="search-input"
          placeholder="Search matches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {(['all', 'unread', 'new'] as const).map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* New Matches - Horizontal Scroll */}
      {newMatches.length > 0 && (
        <div className="new-matches-section">
          <h3 className="section-title">New Matches</h3>
          <div className="new-matches-scroll" ref={newMatchesRef}>
            {newMatches.map((match) => (
              <div
                key={match.id}
                className="new-match-item"
                onClick={() => handleOpenChat(match.id)}
              >
                <div className={`match-avatar-ring ${match.matchType}`}>
                  <img
                    className="match-avatar"
                    src={match.user.avatarUrl}
                    alt={match.user.displayName}
                  />
                  {match.user.isOnline && <span className="online-dot" />}
                  {match.matchType === 'superlike' && (
                    <span className="superlike-badge">&#9733;</span>
                  )}
                </div>
                <span className="match-name">{match.user.displayName}</span>
                <span className="match-compatibility">{match.compatibility}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Icebreaker Suggestions */}
      <div className="icebreaker-section">
        <button className="icebreaker-toggle" onClick={() => setShowIcebreakers(!showIcebreakers)}>
          <span className="icebreaker-icon">💡</span>
          <span>Icebreaker Ideas</span>
          <span className="toggle-arrow">{showIcebreakers ? '▲' : '▼'}</span>
        </button>
        {showIcebreakers && (
          <div className="icebreaker-panel">
            {ICEBREAKER_SUGGESTIONS.map((suggestion) => (
              <div key={suggestion.id} className="icebreaker-item">
                <span className={`icebreaker-category ${suggestion.category}`}>
                  {suggestion.category}
                </span>
                <p className="icebreaker-text">{suggestion.text}</p>
                <button
                  className="use-icebreaker-btn"
                  onClick={() =>
                    selectedConversation &&
                    handleSendIcebreaker(suggestion.text, selectedConversation)
                  }
                >
                  Use
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="conversations-list">
        <h3 className="section-title">Conversations</h3>
        {activeConversations.length === 0 && (
          <p className="no-conversations">No conversations found</p>
        )}
        {activeConversations.map((convo) => (
          <div
            key={convo.id}
            className={`conversation-item ${convo.unreadCount > 0 ? 'unread' : ''}`}
            onClick={() => handleOpenChat(convo.id)}
          >
            <div className="convo-avatar-wrapper">
              <img
                className="convo-avatar"
                src={convo.user.avatarUrl}
                alt={convo.user.displayName}
              />
              {convo.user.isOnline && <span className="online-indicator" />}
              {convo.user.isVerified && <span className="verified-mini">&#10003;</span>}
            </div>
            <div className="convo-content">
              <div className="convo-top-row">
                <span className="convo-name">
                  {convo.user.displayName}, {convo.user.age}
                </span>
                <span className="convo-time">{convo.lastMessageTime || convo.matchedAt}</span>
              </div>
              <div className="convo-bottom-row">
                <span className="convo-preview">
                  {convo.lastMessage || 'Start the conversation!'}
                </span>
                {convo.unreadCount > 0 && <span className="unread-count">{convo.unreadCount}</span>}
              </div>
            </div>
            <button
              className="convo-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setShowUnmatchMenu(convo.id);
              }}
            >
              &#8942;
            </button>

            {/* Unmatch Menu */}
            {showUnmatchMenu === convo.id && (
              <div className="unmatch-menu" onClick={(e) => e.stopPropagation()}>
                <button className="unmatch-option" onClick={() => handleUnmatch(convo.id)}>
                  Unmatch
                </button>
                <button
                  className="unmatch-option report"
                  onClick={() => {
                    handleUnmatch(convo.id);
                  }}
                >
                  Report & Unmatch
                </button>
                <button className="unmatch-option cancel" onClick={() => setShowUnmatchMenu(null)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Match Celebration Modal */}
      {showMatchCelebration && celebrationUser && (
        <div className="celebration-overlay" onClick={() => setShowMatchCelebration(false)}>
          <div className="celebration-modal" onClick={(e) => e.stopPropagation()}>
            {confettiActive && (
              <div className="confetti-container">
                {Array.from({ length: 50 }, (_, i) => (
                  <div
                    key={i}
                    className="confetti-piece"
                    style={{
                      left: `${Math.random() * 100}%`,
                      animationDelay: `${Math.random() * 2}s`,
                      backgroundColor: ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f'][i % 6],
                    }}
                  />
                ))}
              </div>
            )}
            <h1 className="celebration-title">It's a Match!</h1>
            <p className="celebration-subtitle">
              You and {celebrationUser.displayName} liked each other
            </p>
            <img
              className="celebration-avatar"
              src={celebrationUser.avatarUrl}
              alt={celebrationUser.displayName}
            />
            <div className="celebration-actions">
              <button className="send-message-btn">Send Message</button>
              <button className="keep-going-btn" onClick={() => setShowMatchCelebration(false)}>
                Keep Browsing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchesPage;
