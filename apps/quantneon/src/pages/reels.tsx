// ============================================================================
// QuantNeon - Reels Feed
// ============================================================================

import React, { useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      >
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

              {!state.isPlaying && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20"
                >
                  <span className="text-5xl">▶</span>
                </motion.div>
              )}

              <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5">
                <SpringButton
                  className={`min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 ${state.liked.has(currentReel.id) ? 'text-red-500' : 'text-white'}`}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    state.liked.has(currentReel.id)
                      ? actions.unlike(currentReel.id)
                      : actions.like(currentReel.id);
                  }}
                >
                  <span className="text-2xl">❤️</span>
                  <span className="text-xs">{formatCount(currentReel.likeCount)}</span>
                </SpringButton>
                <SpringButton
                  className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-white"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                  }}
                >
                  <span className="text-2xl">💬</span>
                  <span className="text-xs">{formatCount(currentReel.commentCount)}</span>
                </SpringButton>
                <SpringButton
                  className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-white"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    actions.share(currentReel.id);
                  }}
                >
                  <span className="text-2xl">↗</span>
                  <span className="text-xs">{formatCount(currentReel.shareCount)}</span>
                </SpringButton>
                <SpringButton
                  className="min-w-[44px] min-h-[44px] flex flex-col items-center justify-center gap-1 text-white"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    actions.toggleMute();
                  }}
                >
                  <span className="text-2xl">{state.isMuted ? '🔇' : '🔊'}</span>
                </SpringButton>
              </div>

              <div className="absolute bottom-4 left-3 right-16">
                <div className="flex items-center gap-2 mb-2">
                  <img
                    className="w-8 h-8 rounded-full object-cover border border-white/30"
                    src={currentReel.creatorAvatar}
                    alt={currentReel.creator}
                  />
                  <span className="font-semibold text-sm">@{currentReel.creator}</span>
                </div>
                <p className="text-sm leading-snug line-clamp-2">{currentReel.caption}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs">🎵</span>
                  <span className="text-xs truncate">{currentReel.soundName}</span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                <motion.div
                  className="h-full bg-white"
                  style={{ width: `${state.progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default ReelsPage;
