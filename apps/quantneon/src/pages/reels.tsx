// ============================================================================
// QuantNeon - Full-Screen Vertical Reels Player
// Swipe navigation, creator info, actions overlay, sound ticker
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReelCreator {
  id: string;
  username: string;
  avatarUrl: string;
  isVerified: boolean;
  followerCount: number;
}

interface ReelData {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  creator: ReelCreator;
  caption: string;
  hashtags: string[];
  soundName: string;
  soundArtist: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  saveCount: number;
  isOriginalSound: boolean;
  duration: number;
}

interface ReelComment {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  likes: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const generateReels = (): ReelData[] => {
  const creators = [
    { id: 'c1', username: 'dance_queen', avatarUrl: 'https://picsum.photos/seed/rc1/80/80', isVerified: true, followerCount: 2500000 },
    { id: 'c2', username: 'comedy_king', avatarUrl: 'https://picsum.photos/seed/rc2/80/80', isVerified: true, followerCount: 5800000 },
    { id: 'c3', username: 'travel_clips', avatarUrl: 'https://picsum.photos/seed/rc3/80/80', isVerified: false, followerCount: 890000 },
    { id: 'c4', username: 'food_magic', avatarUrl: 'https://picsum.photos/seed/rc4/80/80', isVerified: false, followerCount: 1200000 },
    { id: 'c5', username: 'fitness_pro', avatarUrl: 'https://picsum.photos/seed/rc5/80/80', isVerified: true, followerCount: 3400000 },
    { id: 'c6', username: 'art_timelapse', avatarUrl: 'https://picsum.photos/seed/rc6/80/80', isVerified: false, followerCount: 670000 },
    { id: 'c7', username: 'pet_daily', avatarUrl: 'https://picsum.photos/seed/rc7/80/80', isVerified: false, followerCount: 950000 },
    { id: 'c8', username: 'music_covers', avatarUrl: 'https://picsum.photos/seed/rc8/80/80', isVerified: true, followerCount: 4100000 },
  ];

  return creators.map((creator, i) => ({
    id: `reel-${i}`,
    videoUrl: `https://example.com/reels/${i}.mp4`,
    thumbnailUrl: `https://picsum.photos/seed/reel${i}/400/700`,
    creator,
    caption: `Check out this amazing content! ${i % 2 === 0 ? 'Drop a like if you agree' : 'Follow for more'} #viral #trending #quantneon`,
    hashtags: ['viral', 'trending', 'quantneon', 'foryou'],
    soundName: ['Original Sound', 'Trending Beat', 'Summer Vibes', 'Chill Lo-Fi'][i % 4],
    soundArtist: creator.username,
    likeCount: Math.floor(Math.random() * 500000) + 10000,
    commentCount: Math.floor(Math.random() * 50000) + 500,
    shareCount: Math.floor(Math.random() * 100000) + 1000,
    saveCount: Math.floor(Math.random() * 80000) + 500,
    isOriginalSound: i % 3 === 0,
    duration: Math.floor(Math.random() * 45) + 15,
  }));
};

const generateComments = (): ReelComment[] => [
  { id: 'rc1', username: 'viewer_one', avatarUrl: 'https://picsum.photos/seed/rv1/40/40', text: 'This is incredible!!! ', likes: 234, timestamp: '2h' },
  { id: 'rc2', username: 'fan_account', avatarUrl: 'https://picsum.photos/seed/rv2/40/40', text: 'Tutorial please!', likes: 189, timestamp: '1h' },
  { id: 'rc3', username: 'daily_watcher', avatarUrl: 'https://picsum.photos/seed/rv3/40/40', text: 'Been watching this on repeat', likes: 67, timestamp: '45m' },
  { id: 'rc4', username: 'new_follower', avatarUrl: 'https://picsum.photos/seed/rv4/40/40', text: 'Just followed! Amazing content', likes: 23, timestamp: '30m' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ReelsPage: React.FC = () => {
  const [reels, setReels] = useState<ReelData[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [savedReels, setSavedReels] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [commentDrawerOpen, setCommentDrawerOpen] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentText, setCommentText] = useState<string>('');
  const [showLikeAnimation, setShowLikeAnimation] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load reels
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 500));
        setReels(generateReels());
        setComments(generateComments());
      } catch (err) {
        setError('Failed to load reels.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Progress simulation
  useEffect(() => {
    if (loading || reels.length === 0) return;
    const duration = reels[currentIndex]?.duration || 30;
    const interval = 100;
    const increment = (interval / (duration * 1000)) * 100;

    setProgress(0);
    progressIntervalRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [currentIndex, loading, reels.length]);

  // Navigation
  const handleNext = useCallback(() => {
    setReels(current => {
      if (current.length === 0) return current;
      setCurrentIndex(prev => (prev + 1) % current.length);
      return current;
    });
    setProgress(0);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + reels.length) % reels.length);
    setProgress(0);
  }, [reels.length]);

  // Interactions
  const handleLike = useCallback((reelId: string) => {
    setLikedReels(prev => {
      const next = new Set(prev);
      if (next.has(reelId)) next.delete(reelId);
      else next.add(reelId);
      return next;
    });
  }, []);

  const handleDoubleTap = useCallback((reelId: string) => {
    setLikedReels(prev => {
      const next = new Set(prev);
      next.add(reelId);
      return next;
    });
    setShowLikeAnimation(true);
    setTimeout(() => setShowLikeAnimation(false), 1000);
  }, []);

  const handleSave = useCallback((reelId: string) => {
    setSavedReels(prev => {
      const next = new Set(prev);
      if (next.has(reelId)) next.delete(reelId);
      else next.add(reelId);
      return next;
    });
  }, []);

  const handleFollow = useCallback((creatorId: string) => {
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(creatorId)) next.delete(creatorId);
      else next.add(creatorId);
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted(prev => !prev);
  }, []);

  const handlePostComment = useCallback(() => {
    if (!commentText.trim()) return;
    const newComment: ReelComment = {
      id: `rc-${Date.now()}`,
      username: 'you',
      avatarUrl: 'https://picsum.photos/seed/you/40/40',
      text: commentText,
      likes: 0,
      timestamp: 'now',
    };
    setComments(prev => [newComment, ...prev]);
    setCommentText('');
  }, [commentText]);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return String(count);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading Reels...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <p className="text-white text-center">{error}</p>
          <button
            onClick={() => { setError(null); setReels(generateReels()); setLoading(false); }}
            className="px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (reels.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
            <span className="text-4xl">🎬</span>
          </div>
          <h2 className="text-white text-xl font-semibold">No Reels Yet</h2>
          <p className="text-gray-400 text-center">Create your first reel and start sharing!</p>
        </div>
      </div>
    );
  }

  const currentReel = reels[currentIndex];
  const isLiked = likedReels.has(currentReel.id);
  const isSaved = savedReels.has(currentReel.id);
  const isFollowing = following.has(currentReel.creator.id);

  return (
    <div className="relative h-screen bg-black overflow-hidden select-none">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 z-30 h-1 bg-gray-800">
        <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>

      {/* Full-screen reel */}
      <div
        className="relative w-full h-full"
        onDoubleClick={() => handleDoubleTap(currentReel.id)}
      >
        {/* Video/image placeholder */}
        <img
          src={currentReel.thumbnailUrl}
          alt={`Reel by ${currentReel.creator.username}`}
          className="w-full h-full object-cover"
        />

        {/* Like animation */}
        {showLikeAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <svg className="w-24 h-24 text-white animate-ping" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )}

        {/* Mute indicator */}
        {muted && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-3 py-1 z-20">
            <span className="text-white text-xs">Sound off</span>
          </div>
        )}

        {/* Right side actions */}
        <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
          {/* Creator avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden">
              <img src={currentReel.creator.avatarUrl} alt={currentReel.creator.username} className="w-full h-full object-cover" />
            </div>
            {!isFollowing && (
              <button
                onClick={() => handleFollow(currentReel.creator.id)}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center border border-white"
              >
                <span className="text-white text-xs">+</span>
              </button>
            )}
          </div>

          {/* Like */}
          <button onClick={() => handleLike(currentReel.id)} className="flex flex-col items-center gap-1">
            <svg className={`w-7 h-7 ${isLiked ? 'text-red-500 fill-current' : 'text-white'}`} fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-white text-xs font-medium">{formatCount(currentReel.likeCount + (isLiked ? 1 : 0))}</span>
          </button>

          {/* Comment */}
          <button onClick={() => setCommentDrawerOpen(true)} className="flex flex-col items-center gap-1">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-white text-xs font-medium">{formatCount(currentReel.commentCount)}</span>
          </button>

          {/* Share */}
          <button className="flex flex-col items-center gap-1">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="text-white text-xs font-medium">{formatCount(currentReel.shareCount)}</span>
          </button>

          {/* Save */}
          <button onClick={() => handleSave(currentReel.id)} className="flex flex-col items-center gap-1">
            <svg className={`w-7 h-7 ${isSaved ? 'text-white fill-current' : 'text-white'}`} fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="text-white text-xs font-medium">{formatCount(currentReel.saveCount)}</span>
          </button>

          {/* Sound */}
          <button onClick={handleToggleMute} className="flex flex-col items-center gap-1">
            <div className="w-7 h-7 rounded-md border border-white overflow-hidden animate-spin" style={{ animationDuration: '3s' }}>
              <img src={currentReel.creator.avatarUrl} alt="Sound" className="w-full h-full object-cover" />
            </div>
          </button>
        </div>

        {/* Bottom overlay - creator info */}
        <div className="absolute bottom-4 left-3 right-16 z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-white font-semibold text-sm">@{currentReel.creator.username}</span>
            {currentReel.creator.isVerified && (
              <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
            {!isFollowing && (
              <button
                onClick={() => handleFollow(currentReel.creator.id)}
                className="ml-2 px-3 py-0.5 border border-white rounded text-white text-xs font-medium hover:bg-white hover:text-black transition-colors"
              >
                Follow
              </button>
            )}
          </div>

          {/* Caption */}
          <p className="text-white text-sm mb-2 line-clamp-2">{currentReel.caption}</p>

          {/* Sound ticker / marquee */}
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
            <div className="overflow-hidden">
              <p className="text-white text-xs whitespace-nowrap animate-marquee">
                {currentReel.soundName} - {currentReel.soundArtist} {currentReel.isOriginalSound && '(Original Sound)'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation buttons */}
        <button
          onClick={handlePrev}
          className="absolute top-1/2 -translate-y-1/2 left-2 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center hover:bg-black/50 transition-colors z-10"
          aria-label="Previous reel"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          onClick={handleNext}
          className="absolute top-1/2 translate-y-1/2 left-2 w-10 h-10 bg-black/30 rounded-full flex items-center justify-center hover:bg-black/50 transition-colors z-10"
          aria-label="Next reel"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Progress dots on side */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10">
          {reels.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((_, i) => {
            const actualIdx = Math.max(0, currentIndex - 3) + i;
            return (
              <div
                key={actualIdx}
                className={`w-1 rounded-full transition-all ${actualIdx === currentIndex ? 'h-4 bg-white' : 'h-1.5 bg-white/40'}`}
              />
            );
          })}
        </div>
      </div>

      {/* Create reel FAB */}
      <button className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg z-20 hover:scale-110 transition-transform">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {/* Comment Drawer */}
      {commentDrawerOpen && (
        <div className="absolute inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/60" onClick={() => setCommentDrawerOpen(false)} />
          <div className="bg-gray-900 rounded-t-2xl max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <h3 className="text-white font-semibold">Comments</h3>
              <button onClick={() => setCommentDrawerOpen(false)} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.3 5.71a1 1 0 00-1.42 0L12 10.59 7.12 5.71a1 1 0 00-1.42 1.42L10.59 12l-4.88 4.88a1 1 0 001.42 1.42L12 13.41l4.88 4.88a1 1 0 001.42-1.42L13.41 12l4.88-4.88a1 1 0 000-1.41z" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <img src={comment.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-white mr-1">{comment.username}</span>
                      <span className="text-gray-300">{comment.text}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{comment.timestamp}</span>
                      <span className="text-xs text-gray-500">{comment.likes} likes</span>
                      <button className="text-xs text-gray-500 hover:text-white">Reply</button>
                    </div>
                  </div>
                  <button className="text-gray-500 hover:text-red-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-800">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-gray-800 rounded-full px-4 py-2 text-sm text-white placeholder-gray-500 outline-none"
              />
              {commentText.trim() && (
                <button onClick={handlePostComment} className="text-blue-500 font-semibold text-sm">Post</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelsPage;
