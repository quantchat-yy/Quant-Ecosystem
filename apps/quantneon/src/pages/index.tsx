// ============================================================================
// QuantNeon - Instagram-Style Feed Page
// Stories bar, posts feed, infinite scroll, pull-to-refresh
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoryUser {
  id: string;
  username: string;
  avatarUrl: string;
  hasUnviewed: boolean;
  isLive: boolean;
}

interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  altText: string;
  width: number;
  height: number;
}

interface PostComment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  likes: number;
}

interface FeedPost {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  isVerified: boolean;
  location: string | null;
  media: PostMedia[];
  caption: string;
  mentions: string[];
  hashtags: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  timestamp: string;
  isLiked: boolean;
  isSaved: boolean;
  isSponsored: boolean;
  topComments: PostComment[];
}

// ---------------------------------------------------------------------------
// Mock Data Generators
// ---------------------------------------------------------------------------

const generateStories = (): StoryUser[] => {
  const names = ['alex_photo', 'travel_jane', 'foodie_mark', 'fitness_sam', 'art_studio', 'music_vibes', 'tech_guru', 'nature_lover', 'fashion_daily', 'pet_world', 'design_lab', 'yoga_flow'];
  return names.map((name, i) => ({
    id: `story-${i}`,
    username: name,
    avatarUrl: `https://picsum.photos/seed/${name}/80/80`,
    hasUnviewed: Math.random() > 0.4,
    isLive: i < 2,
  }));
};

const generatePosts = (page: number): FeedPost[] => {
  return Array.from({ length: 5 }, (_, i) => {
    const idx = page * 5 + i;
    const usernames = ['creative_mind', 'urban_explorer', 'chef_marco', 'wanderlust_co', 'pixel_perfect', 'daily_vibes', 'sunset_chaser', 'coffee_addict'];
    const username = usernames[idx % usernames.length];
    const mediaCount = Math.random() > 0.6 ? Math.floor(Math.random() * 4) + 2 : 1;
    return {
      id: `post-${idx}`,
      userId: `user-${idx % 8}`,
      username,
      userAvatar: `https://picsum.photos/seed/u${idx}/64/64`,
      isVerified: idx % 3 === 0,
      location: idx % 2 === 0 ? ['New York, NY', 'Tokyo, Japan', 'Paris, France', 'Bali, Indonesia'][idx % 4] : null,
      media: Array.from({ length: mediaCount }, (_, mi) => ({
        id: `media-${idx}-${mi}`,
        url: `https://picsum.photos/seed/p${idx}m${mi}/600/600`,
        type: 'image' as const,
        altText: `Photo by ${username}`,
        width: 600,
        height: 600,
      })),
      caption: `Amazing day! ${idx % 2 === 0 ? '@friend_one @buddy_two ' : ''}#photography #lifestyle #quantneon`,
      mentions: idx % 2 === 0 ? ['friend_one', 'buddy_two'] : [],
      hashtags: ['photography', 'lifestyle', 'quantneon'],
      likeCount: Math.floor(Math.random() * 15000) + 100,
      commentCount: Math.floor(Math.random() * 500) + 5,
      shareCount: Math.floor(Math.random() * 200),
      timestamp: `${Math.floor(Math.random() * 23) + 1}h`,
      isLiked: false,
      isSaved: false,
      isSponsored: idx % 7 === 0,
      topComments: [
        { id: `c-${idx}-1`, username: 'commenter_a', text: 'Love this! So beautiful', timestamp: '2h', likes: 12 },
        { id: `c-${idx}-2`, username: 'commenter_b', text: 'Where is this place?', timestamp: '1h', likes: 5 },
      ],
    };
  });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [newPostsAvailable, setNewPostsAvailable] = useState<boolean>(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState<Record<string, number>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const feedRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    const loadFeed = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 800));
        setStories(generateStories());
        setPosts(generatePosts(0));
        setCurrentPage(1);
      } catch (err) {
        setError('Failed to load feed. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadFeed();
  }, []);

  // Simulate new posts notification after 30 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setNewPostsAvailable(true);
    }, 30000);
    return () => clearTimeout(timer);
  }, []);

  // Infinite scroll
  const loadMorePosts = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    await new Promise(resolve => setTimeout(resolve, 600));
    const newPosts = generatePosts(currentPage);
    setPosts(prev => [...prev, ...newPosts]);
    setCurrentPage(prev => prev + 1);
    setLoadingMore(false);
  }, [currentPage, loadingMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (!feedRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
      if (scrollHeight - scrollTop - clientHeight < 500) {
        loadMorePosts();
      }
    };
    const el = feedRef.current;
    if (el) el.addEventListener('scroll', handleScroll);
    return () => { if (el) el.removeEventListener('scroll', handleScroll); };
  }, [loadMorePosts]);

  // Pull-to-refresh simulation
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setNewPostsAvailable(false);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setStories(generateStories());
    setPosts(generatePosts(0));
    setCurrentPage(1);
    setLikedPosts(new Set());
    setSavedPosts(new Set());
    setRefreshing(false);
  }, []);

  // Post interactions
  const handleLike = useCallback((postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const handleSave = useCallback((postId: string) => {
    setSavedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }, []);

  const handleDoubleTapLike = useCallback((postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
  }, []);

  const handleCarouselNav = useCallback((postId: string, direction: 'prev' | 'next', maxIndex: number) => {
    setActiveCarouselIndex(prev => {
      const current = prev[postId] || 0;
      const next = direction === 'next' ? Math.min(current + 1, maxIndex) : Math.max(current - 1, 0);
      return { ...prev, [postId]: next };
    });
  }, []);

  const handleCommentInput = useCallback((postId: string, value: string) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));
  }, []);

  const handlePostComment = useCallback((postId: string) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  }, [commentInputs]);

  // Render helpers
  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  };

  const renderCaption = (caption: string): React.ReactNode => {
    const parts = caption.split(/(@\w+|#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-blue-500 font-medium cursor-pointer hover:underline">{part}</span>;
      }
      if (part.startsWith('#')) {
        return <span key={i} className="text-blue-500 cursor-pointer hover:underline">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading your feed...</p>
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
          <button onClick={handleRefresh} className="px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
            <span className="text-4xl">📷</span>
          </div>
          <h2 className="text-white text-xl font-semibold">No Posts Yet</h2>
          <p className="text-gray-400 text-center">Follow people to see their photos and videos here.</p>
          <button className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium">
            Find People to Follow
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={feedRef} className="h-screen overflow-y-auto bg-black text-white">
      {/* New posts banner */}
      {newPostsAvailable && (
        <div className="sticky top-0 z-50 flex justify-center py-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-500 text-white text-sm rounded-full font-medium shadow-lg hover:bg-blue-600 transition-all animate-bounce"
          >
            New Posts Available
          </button>
        </div>
      )}

      {/* Pull-to-refresh indicator */}
      {refreshing && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 bg-clip-text text-transparent">
          QuantNeon
        </h1>
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors" aria-label="Notifications">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-800 rounded-full transition-colors" aria-label="Messages">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Stories Bar */}
      <div className="border-b border-gray-800 py-3">
        <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
          {/* Your story */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
              <span className="text-2xl">+</span>
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-blue-500 rounded-full border-2 border-black flex items-center justify-center">
                <span className="text-xs">+</span>
              </div>
            </div>
            <span className="text-xs text-gray-400 max-w-[64px] truncate">Your story</span>
          </div>

          {/* Other stories */}
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer">
              <div className={`relative w-16 h-16 rounded-full p-[2px] ${
                story.isLive
                  ? 'bg-gradient-to-tr from-red-500 to-pink-500'
                  : story.hasUnviewed
                    ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500'
                    : 'bg-gray-600'
              }`}>
                <div className="w-full h-full rounded-full border-2 border-black overflow-hidden">
                  <img src={story.avatarUrl} alt={story.username} className="w-full h-full object-cover" />
                </div>
                {story.isLive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold px-1.5 rounded-sm">
                    LIVE
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-300 max-w-[64px] truncate">{story.username}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Feed */}
      <div className="max-w-lg mx-auto">
        {posts.map((post) => {
          const isLiked = likedPosts.has(post.id);
          const isSaved = savedPosts.has(post.id);
          const carouselIdx = activeCarouselIndex[post.id] || 0;

          return (
            <article key={post.id} className="border-b border-gray-800 pb-4">
              {/* Post header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img src={post.userAvatar} alt={post.username} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold">{post.username}</span>
                      {post.isVerified && (
                        <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      )}
                      {post.isSponsored && <span className="text-xs text-gray-500 ml-1">Sponsored</span>}
                    </div>
                    {post.location && <span className="text-xs text-gray-400">{post.location}</span>}
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-800 rounded-full" aria-label="More options">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
              </div>

              {/* Image carousel */}
              <div
                className="relative aspect-square bg-gray-900"
                onDoubleClick={() => handleDoubleTapLike(post.id)}
              >
                <img
                  src={post.media[carouselIdx]?.url}
                  alt={post.media[carouselIdx]?.altText || ''}
                  className="w-full h-full object-cover"
                />
                {post.media.length > 1 && (
                  <>
                    {carouselIdx > 0 && (
                      <button
                        onClick={() => handleCarouselNav(post.id, 'prev', post.media.length - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
                      >
                        <span className="text-sm">&lt;</span>
                      </button>
                    )}
                    {carouselIdx < post.media.length - 1 && (
                      <button
                        onClick={() => handleCarouselNav(post.id, 'next', post.media.length - 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80"
                      >
                        <span className="text-sm">&gt;</span>
                      </button>
                    )}
                    {/* Dots indicator */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      {post.media.map((_, idx) => (
                        <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === carouselIdx ? 'bg-blue-500 scale-125' : 'bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
                {post.media.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    {carouselIdx + 1}/{post.media.length}
                  </div>
                )}
              </div>

              {/* Actions row */}
              <div className="flex items-center justify-between px-4 pt-3">
                <div className="flex items-center gap-4">
                  <button onClick={() => handleLike(post.id)} className="hover:opacity-70 transition-opacity" aria-label="Like">
                    <svg className={`w-6 h-6 ${isLiked ? 'text-red-500 fill-current' : ''}`} fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                  <button className="hover:opacity-70 transition-opacity" aria-label="Comment">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </button>
                  <button className="hover:opacity-70 transition-opacity" aria-label="Share">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <button onClick={() => handleSave(post.id)} className="hover:opacity-70 transition-opacity" aria-label="Save">
                  <svg className={`w-6 h-6 ${isSaved ? 'fill-current text-white' : ''}`} fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>

              {/* Like count */}
              <div className="px-4 mt-2">
                <span className="text-sm font-semibold">
                  {formatCount(post.likeCount + (isLiked ? 1 : 0))} likes
                </span>
              </div>

              {/* Caption with mentions and hashtags */}
              <div className="px-4 mt-1">
                <p className="text-sm">
                  <span className="font-semibold mr-1">{post.username}</span>
                  {renderCaption(post.caption)}
                </p>
              </div>

              {/* View all comments link */}
              {post.commentCount > 2 && (
                <button className="px-4 mt-1 text-sm text-gray-400 hover:text-gray-300">
                  View all {post.commentCount} comments
                </button>
              )}

              {/* Top comments */}
              <div className="px-4 mt-1 space-y-1">
                {post.topComments.map(comment => (
                  <p key={comment.id} className="text-sm">
                    <span className="font-semibold mr-1">{comment.username}</span>
                    <span className="text-gray-300">{comment.text}</span>
                  </p>
                ))}
              </div>

              {/* Timestamp */}
              <div className="px-4 mt-2">
                <span className="text-xs text-gray-500 uppercase">{post.timestamp} ago</span>
              </div>

              {/* Add comment input */}
              <div className="flex items-center gap-3 px-4 mt-3">
                <div className="w-6 h-6 rounded-full bg-gray-700 flex-shrink-0" />
                <input
                  type="text"
                  value={commentInputs[post.id] || ''}
                  onChange={(e) => handleCommentInput(post.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handlePostComment(post.id)}
                  placeholder="Add a comment..."
                  className="flex-1 bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none"
                />
                {commentInputs[post.id]?.trim() && (
                  <button
                    onClick={() => handlePostComment(post.id)}
                    className="text-blue-500 text-sm font-semibold hover:text-blue-400"
                  >
                    Post
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {/* Loading more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedPage;
