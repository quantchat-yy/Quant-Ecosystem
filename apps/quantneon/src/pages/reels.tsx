// ============================================================================
// QuantNeon - Reels Feed (Full-Screen Vertical Scroll)
// 100vh per reel, sound toggle, right sidebar actions, bottom overlay
// ============================================================================

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import {
  LoadingState,
  ErrorState,
  EmptyState,
  SpringButton,
  PageTransition,
} from '@quant/shared-ui';
import { useReels } from '../hooks/useReels';

const ReelsPage: React.FC = () => {
  const [state, actions] = useReels();
  const [showCaption, setShowCaption] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showSoundInfo, setShowSoundInfo] = useState(false);

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
    return (
      <PageTransition>
        <div className="h-[100dvh] bg-black flex items-center justify-center">
          <LoadingState variant="spinner" text="Loading reels..." />
        </div>
      </PageTransition>
    );
  }

  if (state.error && state.reels.length === 0) {
    return (
      <PageTransition>
        <div className="h-[100dvh] bg-black flex items-center justify-center">
          <ErrorState message={state.error} onRetry={() => void actions.loadMore()} />
        </div>
      </PageTransition>
    );
  }

  if (state.reels.length === 0) {
    return (
      <PageTransition>
        <div className="h-[100dvh] bg-black flex items-center justify-center">
          <EmptyState title="No reels" description="Check back later for new reels" />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div
        className="h-[100dvh] bg-black text-white relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        role="region"
        aria-label="Reels feed"
      >
        {/* Sound Toggle - Top Right */}
        <div className="absolute top-4 right-4 z-30">
          <SpringButton
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
            onClick={() => actions.toggleMute()}
            aria-label={state.isMuted ? 'Unmute' : 'Mute'}
          >
            <span className="text-lg">{state.isMuted ? '\u{1F507}' : '\u{1F50A}'}</span>
          </SpringButton>
        </div>

        <AnimatePresence mode="wait">
          {currentReel && (
            <motion.div
              key={currentReel.id}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute inset-0"
              onClick={() => actions.togglePlay()}
            >
              <video
                className="absolute inset-0 w-full h-full object-cover"
                src={currentReel.videoUrl}
                poster={currentReel.thumbnailUrl}
                autoPlay={state.isPlaying}
                loop
                muted={state.isMuted}
                playsInline
              />

              {/* Pause Indicator */}
              {!state.isPlaying && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20"
                >
                  <span className="text-5xl">&#9654;</span>
                </motion.div>
              )}

              {/* Right Sidebar Actions */}
              <div
                className="absolute right-3 bottom-32 flex flex-col items-center gap-5"
                aria-label="Reel actions"
              >
                {/* Like */}
                <SpringButton
                  className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 ${state.liked.has(currentReel.id) ? 'text-red-500' : 'text-white'}`}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    state.liked.has(currentReel.id)
                      ? actions.unlike(currentReel.id)
                      : actions.like(currentReel.id);
                  }}
                  aria-label={`Like, ${formatCount(currentReel.likeCount)}`}
                  aria-pressed={state.liked.has(currentReel.id)}
                >
                  <motion.span
                    className="text-2xl"
                    animate={state.liked.has(currentReel.id) ? { scale: [1, 1.4, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {state.liked.has(currentReel.id) ? '\u2764' : '\u2661'}
                  </motion.span>
                  <span className="text-xs">{formatCount(currentReel.likeCount)}</span>
                </SpringButton>

                {/* Comment */}
                <SpringButton
                  className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-white"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                  }}
                  aria-label={`Comments, ${formatCount(currentReel.commentCount)}`}
                >
                  <span className="text-2xl">&#128172;</span>
                  <span className="text-xs">{formatCount(currentReel.commentCount)}</span>
                </SpringButton>

                {/* Share */}
                <SpringButton
                  className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-white"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    actions.share(currentReel.id);
                  }}
                  aria-label={`Share, ${formatCount(currentReel.shareCount)}`}
                >
                  <span className="text-2xl">&#10148;</span>
                  <span className="text-xs">{formatCount(currentReel.shareCount)}</span>
                </SpringButton>

                {/* Bookmark */}
                <SpringButton
                  className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 ${isBookmarked ? 'text-yellow-400' : 'text-white'}`}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setIsBookmarked(!isBookmarked);
                  }}
                  aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
                  aria-pressed={isBookmarked}
                >
                  <span className="text-2xl">{isBookmarked ? '\u{1F516}' : '\u{1F3F7}'}</span>
                </SpringButton>

                {/* Sound Info */}
                <SpringButton
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setShowSoundInfo(!showSoundInfo);
                  }}
                  aria-label="Sound info"
                >
                  <motion.div
                    animate={{ rotate: state.isPlaying ? 360 : 0 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="w-8 h-8 rounded-full border-2 border-white/50 bg-black/40 flex items-center justify-center overflow-hidden"
                  >
                    <span className="text-xs">&#127925;</span>
                  </motion.div>
                </SpringButton>
              </div>

              {/* Bottom Overlay - Creator Info */}
              <div className="absolute bottom-4 left-3 right-16" aria-label="Creator information">
                {/* Creator */}
                <div className="flex items-center gap-2 mb-2">
                  <img
                    className="w-9 h-9 rounded-full object-cover border border-white/30"
                    src={currentReel.creatorAvatar}
                    alt={currentReel.creator}
                  />
                  <span className="font-semibold text-sm">@{currentReel.creator}</span>
                  <button
                    className="ml-2 px-3 py-1 rounded border border-white/60 text-xs font-medium"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Follow creator"
                  >
                    Follow
                  </button>
                </div>

                {/* Caption */}
                <div className="mb-2">
                  <p
                    className={`text-sm leading-snug ${!showCaption ? 'line-clamp-2' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCaption(!showCaption);
                    }}
                  >
                    {currentReel.caption}
                  </p>
                  {currentReel.caption && currentReel.caption.length > 80 && !showCaption && (
                    <button
                      className="text-xs text-white/70 mt-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCaption(true);
                      }}
                    >
                      See more
                    </button>
                  )}
                </div>

                {/* Original Sound Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs">&#127925;</span>
                  <div className="overflow-hidden max-w-[200px]">
                    <motion.span
                      className="text-xs whitespace-nowrap inline-block"
                      animate={{ x: state.isPlaying ? [0, -100] : 0 }}
                      transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
                    >
                      {currentReel.soundName || 'Original Sound'}
                    </motion.span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/20">
                <motion.div
                  className="h-full bg-white"
                  style={{ width: `${state.progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sound Info Popover */}
        <AnimatePresence>
          {showSoundInfo && currentReel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', ...spring.snappy }}
              className="absolute bottom-24 right-3 z-40 rounded-xl bg-black/80 backdrop-blur-md p-3 max-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs font-medium">{currentReel.soundName || 'Original Sound'}</p>
              <p className="text-[10px] text-white/60 mt-0.5">by @{currentReel.creator}</p>
              <button className="mt-2 w-full text-[10px] font-medium bg-white/20 rounded-md py-1.5">
                Use this sound
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default ReelsPage;
