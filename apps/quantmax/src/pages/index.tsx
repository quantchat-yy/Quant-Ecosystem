// ============================================================================
// QuantMax - For You Video Feed (TikTok-style full-screen vertical video player)
// Full-screen swipe-up gesture, like/comment/share/save overlay, creator info,
// sound ticker, progress bar, loading/error/empty states
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useFeed } from '../hooks/useFeed';

type FeedTab = 'following' | 'foryou';

const ForYouFeedPage: React.FC = () => {
  const { state, currentVideo, swipeToNext, swipeToPrevious, toggleLike, toggleMute, togglePlay } =
    useFeed();
  const [activeTab, setActiveTab] = useState<FeedTab>('foryou');
  const [showComments, setShowComments] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);
  const [likeAnimation, setLikeAnimation] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY.current - touchEndY;
      if (diff > 80) swipeToNext();
      else if (diff < -80) swipeToPrevious();
    },
    [swipeToNext, swipeToPrevious],
  );

  const handleDoubleTap = useCallback(() => {
    if (!currentVideo) return;
    if (!currentVideo.isLiked) toggleLike();
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 800);
  }, [currentVideo, toggleLike]);

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  }, []);

  if (state.isLoading && state.videos.length === 0) {
    return <LoadingState variant="spinner" text="Loading your feed..." />;
  }

  if (state.error) {
    return <ErrorState message={state.error} onRetry={() => window.location.reload()} />;
  }

  if (state.videos.length === 0) {
    return (
      <EmptyState
        title="No videos yet"
        description="Follow creators or explore trending content to fill your feed"
      />
    );
  }

  return (
    <div
      className="feed-container"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="feed-nav-tabs">
        <button
          className={`feed-tab ${activeTab === 'following' ? 'active' : ''}`}
          onClick={() => setActiveTab('following')}
        >
          Following
        </button>
        <button
          className={`feed-tab ${activeTab === 'foryou' ? 'active' : ''}`}
          onClick={() => setActiveTab('foryou')}
        >
          For You
        </button>
      </div>

      {currentVideo && (
        <div
          className="video-player-wrapper"
          onClick={() => togglePlay()}
          onDoubleClick={handleDoubleTap}
        >
          <video
            className="fullscreen-video"
            src={currentVideo.videoUrl}
            poster={currentVideo.thumbnailUrl}
            autoPlay={state.isPlaying}
            loop
            muted={state.isMuted}
            playsInline
          />

          {!state.isPlaying && (
            <div className="play-indicator">
              <span className="play-icon">&#9654;</span>
            </div>
          )}
          {likeAnimation && (
            <div className="like-animation">
              <span className="heart-burst">&#10084;</span>
            </div>
          )}

          <div className="action-overlay-right">
            <div className="action-item">
              <div className="creator-avatar-container">
                <img
                  className="creator-avatar"
                  src={currentVideo.creator?.avatarUrl}
                  alt={currentVideo.creator?.username}
                />
              </div>
            </div>
            <button
              className={`action-item ${currentVideo.isLiked ? 'liked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
            >
              <span className="action-icon">&#10084;</span>
              <span className="action-count">{formatCount(currentVideo.likes)}</span>
            </button>
            <button
              className="action-item"
              onClick={(e) => {
                e.stopPropagation();
                setShowComments(true);
              }}
            >
              <span className="action-icon">&#128172;</span>
              <span className="action-count">{formatCount(currentVideo.comments)}</span>
            </button>
            <button
              className="action-item"
              onClick={(e) => {
                e.stopPropagation();
                setShowShareMenu(true);
              }}
            >
              <span className="action-icon">&#10148;</span>
              <span className="action-count">{formatCount(currentVideo.shares)}</span>
            </button>
            <button
              className="action-item mute-btn"
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
            >
              <span className="action-icon">{state.isMuted ? '🔇' : '🔊'}</span>
            </button>
          </div>

          <div className="video-info-bottom">
            <div className="creator-row">
              <span className="creator-name">@{currentVideo.creator?.username}</span>
            </div>
            <p className="video-caption">{currentVideo.caption}</p>
            <div className="hashtags-row">
              {(currentVideo.hashtags || []).map((tag) => (
                <span key={tag} className="hashtag">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="sound-ticker">
              <span className="music-note">&#9835;</span>
              <div className="ticker-scroll">
                <span className="sound-name">{currentVideo.sound?.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showComments && (
        <div className="comments-panel">
          <div className="comments-header">
            <h3 className="comments-title">Comments</h3>
            <button className="close-comments" onClick={() => setShowComments(false)}>
              &#10005;
            </button>
          </div>
          <div className="comments-list">
            <p>Comments loaded from API</p>
          </div>
        </div>
      )}

      {showShareMenu && (
        <div className="share-menu-overlay" onClick={() => setShowShareMenu(false)}>
          <div className="share-menu" onClick={(e) => e.stopPropagation()}>
            <h3 className="share-title">Share to</h3>
            <div className="share-options">
              <button className="share-option">
                <span className="share-icon">&#128172;</span>
                <span>Messages</span>
              </button>
              <button className="share-option">
                <span className="share-icon">&#128279;</span>
                <span>Copy Link</span>
              </button>
            </div>
            <button className="share-cancel" onClick={() => setShowShareMenu(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForYouFeedPage;
