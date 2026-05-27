// ============================================================================
// QuantNeon - Reels Feed
// ============================================================================

import React, { useCallback, useRef } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useReels } from '../hooks/useReels';

const ReelsPage: React.FC = () => {
  const [state, actions] = useReels();
  const touchStartY = useRef<number>(0);

  const currentReel = state.reels[state.currentIndex] || null;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartY.current - e.changedTouches[0].clientY;
      if (diff > 80) actions.next();
      else if (diff < -80) actions.previous();
    },
    [actions],
  );

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  }, []);

  if (state.loading && state.reels.length === 0) {
    return <LoadingState variant="spinner" text="Loading reels..." />;
  }

  if (state.error && state.reels.length === 0) {
    return <ErrorState message={state.error} onRetry={() => void actions.loadMore()} />;
  }

  if (state.reels.length === 0) {
    return <EmptyState title="No reels" description="Check back later for new reels" />;
  }

  return (
    <div className="reels-page" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {currentReel && (
        <div className="reel-player" onClick={() => actions.togglePlay()}>
          <video
            className="reel-video"
            src={currentReel.videoUrl}
            poster={currentReel.thumbnailUrl}
            autoPlay={state.isPlaying}
            loop
            muted={state.isMuted}
            playsInline
          />

          {!state.isPlaying && (
            <div className="play-overlay">
              <span>▶</span>
            </div>
          )}

          <div className="reel-actions">
            <button
              className={`reel-action ${state.liked.has(currentReel.id) ? 'liked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                state.liked.has(currentReel.id)
                  ? actions.unlike(currentReel.id)
                  : actions.like(currentReel.id);
              }}
            >
              <span>❤️</span>
              <span>{formatCount(currentReel.likeCount)}</span>
            </button>
            <button
              className="reel-action"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <span>💬</span>
              <span>{formatCount(currentReel.commentCount)}</span>
            </button>
            <button
              className="reel-action"
              onClick={(e) => {
                e.stopPropagation();
                actions.share(currentReel.id);
              }}
            >
              <span>↗</span>
              <span>{formatCount(currentReel.shareCount)}</span>
            </button>
            <button
              className="reel-action mute"
              onClick={(e) => {
                e.stopPropagation();
                actions.toggleMute();
              }}
            >
              <span>{state.isMuted ? '🔇' : '🔊'}</span>
            </button>
          </div>

          <div className="reel-info">
            <div className="reel-creator">
              <img
                className="creator-avatar"
                src={currentReel.creatorAvatar}
                alt={currentReel.creator}
              />
              <span className="creator-name">@{currentReel.creator}</span>
            </div>
            <p className="reel-caption">{currentReel.caption}</p>
            <div className="reel-sound">
              <span>🎵</span>
              <span>{currentReel.soundName}</span>
            </div>
          </div>

          <div className="reel-progress">
            <div className="progress-fill" style={{ width: `${state.progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelsPage;
