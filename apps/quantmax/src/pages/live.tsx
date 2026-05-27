// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantMax - Live Streaming
// Main video with gradient overlay, gift animations, diamond balance,
// top gifters leaderboard, go-live button with form, stream controls,
// viewer count badge
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface GiftItem {
  id: string;
  name: string;
  icon: string;
  diamondCost: number;
  animation: 'float' | 'burst' | 'rain' | 'spotlight';
}

interface GiftEvent {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  gift: GiftItem;
  timestamp: number;
  quantity: number;
}

interface TopGifter {
  userId: string;
  username: string;
  avatarUrl: string;
  totalDiamonds: number;
  rank: number;
}

interface LiveComment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
  isHost: boolean;
  isPinned: boolean;
}

interface StreamSettings {
  title: string;
  category: string;
  tags: string[];
  allowGifts: boolean;
  chatEnabled: boolean;
  ageRestricted: boolean;
}

type StreamState = 'idle' | 'preview' | 'live' | 'ending';

const GIFT_CATALOG: GiftItem[] = [
  { id: 'g1', name: 'Rose', icon: '🌹', diamondCost: 1, animation: 'float' },
  { id: 'g2', name: 'Heart', icon: '💖', diamondCost: 5, animation: 'float' },
  { id: 'g3', name: 'Star', icon: '⭐', diamondCost: 10, animation: 'burst' },
  { id: 'g4', name: 'Fireworks', icon: '🎆', diamondCost: 50, animation: 'burst' },
  { id: 'g5', name: 'Crown', icon: '👑', diamondCost: 100, animation: 'spotlight' },
  { id: 'g6', name: 'Diamond', icon: '💎', diamondCost: 500, animation: 'rain' },
  { id: 'g7', name: 'Rocket', icon: '🚀', diamondCost: 1000, animation: 'burst' },
  { id: 'g8', name: 'Castle', icon: '🏰', diamondCost: 5000, animation: 'spotlight' },
];

const CATEGORIES = [
  'Just Chatting',
  'Music',
  'Dance',
  'Gaming',
  'Cooking',
  'Art',
  'Fitness',
  'Q&A',
  'Talk Show',
];

const LiveStreamPage: React.FC = () => {
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [diamondBalance, setDiamondBalance] = useState<number>(2500);
  const [totalEarned, setTotalEarned] = useState<number>(0);
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);
  const [giftEvents, setGiftEvents] = useState<GiftEvent[]>([]);
  const [activeGiftAnimation, setActiveGiftAnimation] = useState<GiftEvent | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentInput, setCommentInput] = useState<string>('');
  const [showGiftPanel, setShowGiftPanel] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    title: '',
    category: 'Just Chatting',
    tags: [],
    allowGifts: true,
    chatEnabled: true,
    ageRestricted: false,
  });
  const [showGoLiveForm, setShowGoLiveForm] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [showEffects, setShowEffects] = useState<boolean>(false);
  const [streamDuration, setStreamDuration] = useState<number>(0);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [pinnedComment, setPinnedComment] = useState<LiveComment | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [watchingStreamId, setWatchingStreamId] = useState<string | null>(null);

  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const commentsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (streamState === 'live') {
      durationRef.current = setInterval(() => {
        setStreamDuration((prev) => prev + 1);
      }, 1000);
      viewerRef.current = setInterval(() => {
        setViewerCount((prev) => Math.max(1, prev + Math.floor(Math.random() * 10) - 3));
      }, 3000);
      // Simulate incoming comments
      const commentInterval = setInterval(
        () => {
          const newComment: LiveComment = {
            id: `lc-${Date.now()}`,
            userId: `viewer-${Math.floor(Math.random() * 100)}`,
            username: `viewer${Math.floor(Math.random() * 9999)}`,
            text: ['Great stream!', 'Love this!', 'Keep going!', 'Wow!', 'Haha', 'Amazing!'][
              Math.floor(Math.random() * 6)
            ],
            timestamp: Date.now(),
            isHost: false,
            isPinned: false,
          };
          setComments((prev) => [...prev.slice(-50), newComment]);
        },
        2000 + Math.random() * 3000,
      );

      return () => {
        if (durationRef.current) clearInterval(durationRef.current);
        if (viewerRef.current) clearInterval(viewerRef.current);
        clearInterval(commentInterval);
      };
    }
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
      if (viewerRef.current) clearInterval(viewerRef.current);
    };
  }, [streamState]);

  useEffect(() => {
    if (commentsEndRef.current) {
      commentsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  useEffect(() => {
    // Load top gifters
    const mockGifters: TopGifter[] = Array.from({ length: 10 }, (_, i) => ({
      userId: `gifter-${i}`,
      username: `TopFan${i + 1}`,
      avatarUrl: `https://cdn.quantmax.app/avatars/gifter${i}.jpg`,
      totalDiamonds: (10 - i) * 500 + Math.floor(Math.random() * 200),
      rank: i + 1,
    }));
    setTopGifters(mockGifters);
  }, []);

  const handleGoLive = useCallback(() => {
    if (!streamSettings.title.trim()) return;
    setStreamState('live');
    setViewerCount(1);
    setStreamDuration(0);
    setShowGoLiveForm(false);
  }, [streamSettings]);

  const handleEndStream = useCallback(() => {
    setStreamState('ending');
    setTimeout(() => {
      setStreamState('idle');
      setViewerCount(0);
      setStreamDuration(0);
    }, 2000);
  }, []);

  const handleSendGift = useCallback(
    (gift: GiftItem) => {
      if (diamondBalance < gift.diamondCost) return;
      setDiamondBalance((prev) => prev - gift.diamondCost);
      const event: GiftEvent = {
        id: `ge-${Date.now()}`,
        senderId: 'me',
        senderName: 'You',
        senderAvatar: '',
        gift,
        timestamp: Date.now(),
        quantity: 1,
      };
      setGiftEvents((prev) => [...prev, event]);
      setActiveGiftAnimation(event);
      setTimeout(() => setActiveGiftAnimation(null), 3000);
      setTotalEarned((prev) => prev + gift.diamondCost);
    },
    [diamondBalance],
  );

  const handleSendComment = useCallback(() => {
    if (!commentInput.trim()) return;
    const newComment: LiveComment = {
      id: `lc-own-${Date.now()}`,
      userId: 'me',
      username: 'me',
      text: commentInput,
      timestamp: Date.now(),
      isHost: streamState === 'live',
      isPinned: false,
    };
    setComments((prev) => [...prev, newComment]);
    setCommentInput('');
  }, [commentInput, streamState]);

  const handlePinComment = useCallback((comment: LiveComment) => {
    setPinnedComment(comment);
  }, []);

  const handleAddTag = useCallback(() => {
    if (!newTagInput.trim() || streamSettings.tags.length >= 5) return;
    setStreamSettings((prev) => ({ ...prev, tags: [...prev.tags, newTagInput.trim()] }));
    setNewTagInput('');
  }, [newTagInput, streamSettings.tags]);

  const handleRemoveTag = useCallback((tag: string) => {
    setStreamSettings((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  // Idle state - show go-live option and live streams to watch
  if (streamState === 'idle' && !showGoLiveForm) {
    return (
      <div className="live-page idle">
        <div className="live-header">
          <h1 className="live-title">Live</h1>
          <div className="diamond-balance">
            <span className="diamond-icon">💎</span>
            <span className="diamond-count">{diamondBalance.toLocaleString()}</span>
          </div>
        </div>

        <button className="go-live-btn" onClick={() => setShowGoLiveForm(true)}>
          <span className="go-live-icon">📡</span>
          <span className="go-live-text">Go Live</span>
        </button>

        <div className="live-streams-section">
          <h3>Live Now</h3>
          <div className="live-streams-grid">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className="live-stream-card"
                onClick={() => {
                  setIsWatching(true);
                  setWatchingStreamId(`stream-${i}`);
                  setStreamState('live');
                  setViewerCount(50 + Math.floor(Math.random() * 500));
                }}
              >
                <div className="stream-thumbnail">
                  <span className="live-badge-small">LIVE</span>
                  <span className="viewer-badge-small">{50 + Math.floor(Math.random() * 500)}</span>
                </div>
                <div className="stream-info">
                  <span className="streamer-name">Streamer {i + 1}</span>
                  <span className="stream-category">{CATEGORIES[i % CATEGORIES.length]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Go Live Form
  if (showGoLiveForm) {
    return (
      <div className="live-page go-live-form">
        <div className="form-header">
          <button className="back-btn" onClick={() => setShowGoLiveForm(false)}>
            &larr;
          </button>
          <h2>Go Live</h2>
        </div>

        <div className="form-body">
          <div className="form-field">
            <label>Stream Title</label>
            <input
              className="title-input"
              placeholder="Give your stream a title..."
              value={streamSettings.title}
              onChange={(e) => setStreamSettings((prev) => ({ ...prev, title: e.target.value }))}
              maxLength={100}
            />
          </div>

          <div className="form-field">
            <label>Category</label>
            <div className="category-options">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`category-btn ${streamSettings.category === cat ? 'active' : ''}`}
                  onClick={() => setStreamSettings((prev) => ({ ...prev, category: cat }))}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label>Tags ({streamSettings.tags.length}/5)</label>
            <div className="tags-input-row">
              <input
                className="tag-input"
                placeholder="Add a tag..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <button className="add-tag-btn" onClick={handleAddTag}>
                +
              </button>
            </div>
            <div className="tags-display">
              {streamSettings.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {tag}
                  <button className="remove-tag" onClick={() => handleRemoveTag(tag)}>
                    x
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-toggles">
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={streamSettings.allowGifts}
                onChange={(e) =>
                  setStreamSettings((prev) => ({ ...prev, allowGifts: e.target.checked }))
                }
              />
              Allow Gifts
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={streamSettings.chatEnabled}
                onChange={(e) =>
                  setStreamSettings((prev) => ({ ...prev, chatEnabled: e.target.checked }))
                }
              />
              Enable Chat
            </label>
            <label className="toggle-item">
              <input
                type="checkbox"
                checked={streamSettings.ageRestricted}
                onChange={(e) =>
                  setStreamSettings((prev) => ({ ...prev, ageRestricted: e.target.checked }))
                }
              />
              Age Restricted (18+)
            </label>
          </div>

          <button
            className="start-stream-btn"
            onClick={handleGoLive}
            disabled={!streamSettings.title.trim()}
          >
            Start Live Stream
          </button>
        </div>
      </div>
    );
  }

  // Live streaming / watching state
  return (
    <div className="live-page streaming">
      {/* Main Video View */}
      <div className="stream-video-area">
        <div className="video-gradient-overlay" />

        {/* Viewer count badge */}
        <div className="viewer-count-badge">
          <span className="live-dot" />
          <span className="viewer-number">{viewerCount.toLocaleString()} watching</span>
        </div>

        {/* Stream Duration */}
        <div className="stream-duration-badge">
          <span>{formatDuration(streamDuration)}</span>
        </div>

        {/* Diamond Balance */}
        <div className="stream-diamond-display">
          <span className="diamond-icon">💎</span>
          <span className="diamond-amount">{diamondBalance.toLocaleString()}</span>
        </div>

        {/* Gift Animation Area */}
        {activeGiftAnimation && (
          <div className={`gift-animation ${activeGiftAnimation.gift.animation}`}>
            <span className="gift-emoji">{activeGiftAnimation.gift.icon}</span>
            <span className="gift-sender">
              {activeGiftAnimation.senderName} sent {activeGiftAnimation.gift.name}
            </span>
          </div>
        )}

        {/* Pinned Comment */}
        {pinnedComment && (
          <div className="pinned-comment">
            <span className="pin-icon">📌</span>
            <span className="pinned-user">{pinnedComment.username}:</span>
            <span className="pinned-text">{pinnedComment.text}</span>
          </div>
        )}
      </div>

      {/* Top Gifters Leaderboard Sidebar */}
      {showLeaderboard && (
        <div className="leaderboard-sidebar">
          <div className="leaderboard-header">
            <h3>Top Gifters</h3>
            <button className="close-leaderboard" onClick={() => setShowLeaderboard(false)}>
              &#10005;
            </button>
          </div>
          <div className="leaderboard-list">
            {topGifters.map((gifter) => (
              <div key={gifter.userId} className={`gifter-item rank-${gifter.rank}`}>
                <span className="gifter-rank">#{gifter.rank}</span>
                <img className="gifter-avatar" src={gifter.avatarUrl} alt={gifter.username} />
                <span className="gifter-name">{gifter.username}</span>
                <span className="gifter-diamonds">💎 {gifter.totalDiamonds.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Chat */}
      <div className="live-chat-section">
        <div className="chat-messages-live">
          {comments.slice(-30).map((comment) => (
            <div key={comment.id} className={`live-comment ${comment.isHost ? 'host' : ''}`}>
              <span className="comment-user">{comment.username}</span>
              <span className="comment-text">{comment.text}</span>
              {streamState === 'live' && !isWatching && (
                <button className="pin-btn" onClick={() => handlePinComment(comment)}>
                  📌
                </button>
              )}
            </div>
          ))}
          <div ref={commentsEndRef} />
        </div>
        <div className="chat-input-row">
          <input
            className="live-chat-input"
            placeholder="Say something..."
            value={commentInput}
            onChange={(e) => setCommentInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
          />
          <button className="gift-toggle-btn" onClick={() => setShowGiftPanel(!showGiftPanel)}>
            🎁
          </button>
          <button
            className="leaderboard-toggle"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
          >
            🏆
          </button>
        </div>
      </div>

      {/* Gift Panel */}
      {showGiftPanel && (
        <div className="gift-panel">
          <div className="gift-panel-header">
            <h4>Send a Gift</h4>
            <span className="my-diamonds">💎 {diamondBalance.toLocaleString()}</span>
          </div>
          <div className="gift-grid">
            {GIFT_CATALOG.map((gift) => (
              <button
                key={gift.id}
                className="gift-btn"
                onClick={() => handleSendGift(gift)}
                disabled={diamondBalance < gift.diamondCost}
              >
                <span className="gift-icon">{gift.icon}</span>
                <span className="gift-name">{gift.name}</span>
                <span className="gift-cost">💎 {gift.diamondCost}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stream Controls Bar */}
      <div className="stream-controls-bar">
        <button
          className={`stream-control ${isMuted ? 'off' : ''}`}
          onClick={() => setIsMuted(!isMuted)}
        >
          <span>{isMuted ? '🔇' : '🎤'}</span>
        </button>
        <button className="stream-control" onClick={() => setIsFrontCamera(!isFrontCamera)}>
          <span>🔄</span>
        </button>
        <button className="stream-control" onClick={() => setShowEffects(!showEffects)}>
          <span>✨</span>
        </button>
        {!isWatching && (
          <button className="stream-control end-stream" onClick={handleEndStream}>
            <span>End Stream</span>
          </button>
        )}
        {isWatching && (
          <button
            className="stream-control leave-stream"
            onClick={() => {
              setStreamState('idle');
              setIsWatching(false);
            }}
          >
            <span>Leave</span>
          </button>
        )}
      </div>

      {/* Ending overlay */}
      {streamState === 'ending' && (
        <div className="ending-overlay">
          <h2>Stream Ended</h2>
          <div className="stream-summary">
            <p>Duration: {formatDuration(streamDuration)}</p>
            <p>Peak Viewers: {viewerCount}</p>
            <p>Diamonds Earned: 💎 {totalEarned.toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveStreamPage;
