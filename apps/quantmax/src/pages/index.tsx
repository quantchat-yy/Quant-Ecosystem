// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantMax - For You Video Feed (TikTok-style full-screen vertical video player)
// Full-screen swipe-up gesture, like/comment/share/save overlay, creator info,
// sound ticker, progress bar, loading/error/empty states
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface VideoCreator {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isFollowing: boolean;
  isVerified: boolean;
}

interface VideoSound {
  id: string;
  name: string;
  artistName: string;
  coverUrl: string;
}

interface FeedVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  hashtags: string[];
  creator: VideoCreator;
  sound: VideoSound;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  isLiked: boolean;
  isSaved: boolean;
  duration: number;
  viewCount: number;
}

interface CommentItem {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string;
  text: string;
  likes: number;
  timestamp: string;
  isLiked: boolean;
}

type FeedTab = 'following' | 'foryou';

const ForYouFeedPage: React.FC = () => {
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FeedTab>('foryou');
  const [showComments, setShowComments] = useState<boolean>(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);
  const [likeAnimation, setLikeAnimation] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartY = useRef<number>(0);
  const touchEndY = useRef<number>(0);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentVideo = useMemo(() => videos[currentIndex] || null, [videos, currentIndex]);

  useEffect(() => {
    loadFeed();
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  useEffect(() => {
    if (currentVideo && isPlaying) {
      startProgressTracking();
    } else {
      stopProgressTracking();
    }
    return () => stopProgressTracking();
  }, [currentIndex, isPlaying]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      const mockVideos: FeedVideo[] = Array.from({ length: 20 }, (_, i) => ({
        id: `video-${i}`,
        videoUrl: `https://cdn.quantmax.app/videos/${i}.mp4`,
        thumbnailUrl: `https://cdn.quantmax.app/thumbs/${i}.jpg`,
        caption: `Amazing video #${i + 1} with cool effects and vibes`,
        hashtags: ['fyp', 'viral', 'trending', 'quantmax'],
        creator: {
          id: `creator-${i}`,
          username: `creator_${i}`,
          displayName: `Creator ${i}`,
          avatarUrl: `https://cdn.quantmax.app/avatars/${i}.jpg`,
          isFollowing: i % 3 === 0,
          isVerified: i % 4 === 0,
        },
        sound: {
          id: `sound-${i}`,
          name: `Trending Beat ${i}`,
          artistName: `Artist ${i}`,
          coverUrl: `https://cdn.quantmax.app/sounds/${i}.jpg`,
        },
        likes: Math.floor(Math.random() * 500000),
        comments: Math.floor(Math.random() * 10000),
        shares: Math.floor(Math.random() * 5000),
        saves: Math.floor(Math.random() * 20000),
        isLiked: false,
        isSaved: false,
        duration: 15 + Math.floor(Math.random() * 45),
        viewCount: Math.floor(Math.random() * 2000000),
      }));
      setVideos(mockVideos);
    } catch (err) {
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const startProgressTracking = useCallback(() => {
    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          advanceToNext();
          return 0;
        }
        return prev + 100 / ((currentVideo?.duration || 15) * 10);
      });
    }, 100);
  }, [currentVideo]);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  const advanceToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev < videos.length - 1) return prev + 1;
      return prev;
    });
    setProgress(0);
  }, [videos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev > 0) return prev - 1;
      return prev;
    });
    setProgress(0);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchEndY.current = e.changedTouches[0].clientY;
      const diff = touchStartY.current - touchEndY.current;
      if (diff > 80) {
        advanceToNext();
      } else if (diff < -80) {
        goToPrevious();
      }
    },
    [advanceToNext, goToPrevious],
  );

  const handleDoubleTap = useCallback(() => {
    if (!currentVideo) return;
    if (!currentVideo.isLiked) {
      handleLike();
    }
    setLikeAnimation(true);
    setTimeout(() => setLikeAnimation(false), 800);
  }, [currentVideo]);

  const handleLike = useCallback(() => {
    if (!currentVideo) return;
    setVideos((prev) =>
      prev.map((v, i) =>
        i === currentIndex
          ? { ...v, isLiked: !v.isLiked, likes: v.isLiked ? v.likes - 1 : v.likes + 1 }
          : v,
      ),
    );
  }, [currentIndex, currentVideo]);

  const handleSave = useCallback(() => {
    if (!currentVideo) return;
    setVideos((prev) =>
      prev.map((v, i) =>
        i === currentIndex
          ? { ...v, isSaved: !v.isSaved, saves: v.isSaved ? v.saves - 1 : v.saves + 1 }
          : v,
      ),
    );
  }, [currentIndex, currentVideo]);

  const handleFollow = useCallback(() => {
    if (!currentVideo) return;
    setVideos((prev) =>
      prev.map((v, i) =>
        i === currentIndex
          ? { ...v, creator: { ...v.creator, isFollowing: !v.creator.isFollowing } }
          : v,
      ),
    );
  }, [currentIndex, currentVideo]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleOpenComments = useCallback(() => {
    setShowComments(true);
    // Load comments
    const mockComments: CommentItem[] = Array.from({ length: 25 }, (_, i) => ({
      id: `comment-${i}`,
      userId: `user-${i}`,
      username: `user_${i}`,
      avatarUrl: `https://cdn.quantmax.app/avatars/c${i}.jpg`,
      text: `This is comment number ${i + 1}! Great content.`,
      likes: Math.floor(Math.random() * 1000),
      timestamp: `${Math.floor(Math.random() * 24)}h ago`,
      isLiked: false,
    }));
    setComments(mockComments);
  }, []);

  const handlePostComment = useCallback(() => {
    if (!commentText.trim()) return;
    const newComment: CommentItem = {
      id: `comment-new-${Date.now()}`,
      userId: 'me',
      username: 'my_username',
      avatarUrl: '',
      text: commentText,
      likes: 0,
      timestamp: 'Just now',
      isLiked: false,
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
  }, [commentText]);

  const handleLikeComment = useCallback((commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, isLiked: !c.isLiked, likes: c.isLiked ? c.likes - 1 : c.likes + 1 }
          : c,
      ),
    );
  }, []);

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  }, []);

  if (loading) {
    return (
      <div className="feed-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Loading your feed...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="feed-error">
        <div className="error-icon">!</div>
        <p className="error-message">{error}</p>
        <button className="retry-btn" onClick={loadFeed}>
          Try Again
        </button>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="feed-empty">
        <div className="empty-icon">🎬</div>
        <h2 className="empty-title">No videos yet</h2>
        <p className="empty-message">
          Follow creators or explore trending content to fill your feed
        </p>
        <button className="explore-btn" onClick={() => setActiveTab('foryou')}>
          Explore
        </button>
      </div>
    );
  }

  return (
    <div
      className="feed-container"
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Navigation Tabs */}
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

      {/* Video Player Area */}
      {currentVideo && (
        <div
          className="video-player-wrapper"
          onClick={handleTogglePlay}
          onDoubleClick={handleDoubleTap}
        >
          <video
            ref={videoRef}
            className="fullscreen-video"
            src={currentVideo.videoUrl}
            poster={currentVideo.thumbnailUrl}
            autoPlay={isPlaying}
            loop
            muted={isMuted}
            playsInline
          />

          {/* Play/Pause Indicator */}
          {!isPlaying && (
            <div className="play-indicator">
              <span className="play-icon">&#9654;</span>
            </div>
          )}

          {/* Double-tap Like Animation */}
          {likeAnimation && (
            <div className="like-animation">
              <span className="heart-burst">&#10084;</span>
            </div>
          )}

          {/* Progress Bar */}
          <div className="video-progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>

          {/* Right Side Action Buttons */}
          <div className="action-overlay-right">
            <div className="action-item">
              <div
                className="creator-avatar-container"
                onClick={(e) => {
                  e.stopPropagation();
                  handleFollow();
                }}
              >
                <img
                  className="creator-avatar"
                  src={currentVideo.creator.avatarUrl}
                  alt={currentVideo.creator.username}
                />
                {!currentVideo.creator.isFollowing && <span className="follow-badge">+</span>}
              </div>
            </div>

            <button
              className={`action-item ${currentVideo.isLiked ? 'liked' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
            >
              <span className="action-icon">&#10084;</span>
              <span className="action-count">{formatCount(currentVideo.likes)}</span>
            </button>

            <button
              className="action-item"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenComments();
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
              className={`action-item ${currentVideo.isSaved ? 'saved' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
            >
              <span className="action-icon">&#128278;</span>
              <span className="action-count">{formatCount(currentVideo.saves)}</span>
            </button>

            <button
              className="action-item mute-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
            >
              <span className="action-icon">{isMuted ? '🔇' : '🔊'}</span>
            </button>
          </div>

          {/* Bottom Creator Info */}
          <div className="video-info-bottom">
            <div className="creator-row">
              <span className="creator-name">@{currentVideo.creator.username}</span>
              {currentVideo.creator.isVerified && <span className="verified-check">&#10003;</span>}
              {!currentVideo.creator.isFollowing && (
                <button
                  className="follow-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFollow();
                  }}
                >
                  Follow
                </button>
              )}
            </div>
            <p className="video-caption">{currentVideo.caption}</p>
            <div className="hashtags-row">
              {currentVideo.hashtags.map((tag) => (
                <span key={tag} className="hashtag">
                  #{tag}
                </span>
              ))}
            </div>
            <div className="sound-ticker">
              <span className="music-note">&#9835;</span>
              <div className="ticker-scroll">
                <span className="sound-name">
                  {currentVideo.sound.name} - {currentVideo.sound.artistName}
                </span>
              </div>
              <img className="sound-disc" src={currentVideo.sound.coverUrl} alt="Sound" />
            </div>
          </div>
        </div>
      )}

      {/* Comments Panel */}
      {showComments && (
        <div className="comments-panel">
          <div className="comments-header">
            <h3 className="comments-title">{formatCount(currentVideo?.comments || 0)} comments</h3>
            <button className="close-comments" onClick={() => setShowComments(false)}>
              &#10005;
            </button>
          </div>
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <img className="comment-avatar" src={comment.avatarUrl} alt={comment.username} />
                <div className="comment-body">
                  <span className="comment-username">{comment.username}</span>
                  <p className="comment-text">{comment.text}</p>
                  <div className="comment-meta">
                    <span className="comment-time">{comment.timestamp}</span>
                    <button className="comment-reply-btn">Reply</button>
                  </div>
                </div>
                <button
                  className={`comment-like-btn ${comment.isLiked ? 'liked' : ''}`}
                  onClick={() => handleLikeComment(comment.id)}
                >
                  <span>&#10084;</span>
                  <span>{comment.likes}</span>
                </button>
              </div>
            ))}
          </div>
          <div className="comment-input-area">
            <input
              className="comment-input"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
            />
            <button
              className="post-comment-btn"
              onClick={handlePostComment}
              disabled={!commentText.trim()}
            >
              Post
            </button>
          </div>
        </div>
      )}

      {/* Share Menu */}
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
              <button className="share-option">
                <span className="share-icon">&#128247;</span>
                <span>Story</span>
              </button>
              <button className="share-option">
                <span className="share-icon">&#128233;</span>
                <span>Email</span>
              </button>
              <button className="share-option">
                <span className="share-icon">&#128250;</span>
                <span>Repost</span>
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
