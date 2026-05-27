// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantNeon - Post Detail View
// Image carousel, comments, like animation, share
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  altText: string;
}

interface PostAuthor {
  id: string;
  username: string;
  avatarUrl: string;
  isVerified: boolean;
}

interface PostComment {
  id: string;
  author: PostAuthor;
  text: string;
  timestamp: string;
  likeCount: number;
  isLiked: boolean;
  replies: PostReply[];
}

interface PostReply {
  id: string;
  author: PostAuthor;
  text: string;
  timestamp: string;
  likeCount: number;
  isLiked: boolean;
}

interface PostData {
  id: string;
  author: PostAuthor;
  media: PostMedia[];
  caption: string;
  location: string | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  timestamp: string;
  isLiked: boolean;
  isSaved: boolean;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const generatePost = (): PostData => ({
  id: 'post-detail-1',
  author: {
    id: 'author-1',
    username: 'nature_photography',
    avatarUrl: 'https://picsum.photos/seed/postauthor/80/80',
    isVerified: true,
  },
  media: [
    {
      id: 'm1',
      url: 'https://picsum.photos/seed/pd1/800/800',
      type: 'image',
      altText: 'Mountain landscape',
    },
    {
      id: 'm2',
      url: 'https://picsum.photos/seed/pd2/800/800',
      type: 'image',
      altText: 'Lake reflection',
    },
    {
      id: 'm3',
      url: 'https://picsum.photos/seed/pd3/800/800',
      type: 'image',
      altText: 'Sunset view',
    },
    {
      id: 'm4',
      url: 'https://picsum.photos/seed/pd4/800/800',
      type: 'image',
      altText: 'Forest trail',
    },
  ],
  caption:
    'Exploring the beauty of nature 🌿🏔️ Every corner of this trail was breathtaking. The early morning light made everything look magical. If you ever get the chance to visit, do it! #nature #photography #mountains #hiking #adventure #landscape #outdoors @hiking_club @photo_daily',
  location: 'Yosemite National Park',
  likeCount: 24567,
  commentCount: 342,
  shareCount: 1890,
  timestamp: '2 days ago',
  isLiked: false,
  isSaved: false,
});

const generateComments = (): PostComment[] => [
  {
    id: 'c1',
    author: {
      id: 'u1',
      username: 'landscape_lover',
      avatarUrl: 'https://picsum.photos/seed/cu1/40/40',
      isVerified: false,
    },
    text: 'This is absolutely stunning! The light in the second photo is perfect.',
    timestamp: '1d',
    likeCount: 45,
    isLiked: false,
    replies: [
      {
        id: 'r1',
        author: {
          id: 'author-1',
          username: 'nature_photography',
          avatarUrl: 'https://picsum.photos/seed/postauthor/40/40',
          isVerified: true,
        },
        text: 'Thank you! Golden hour never disappoints',
        timestamp: '23h',
        likeCount: 12,
        isLiked: false,
      },
      {
        id: 'r2',
        author: {
          id: 'u5',
          username: 'photo_tips',
          avatarUrl: 'https://picsum.photos/seed/cu5/40/40',
          isVerified: false,
        },
        text: 'What camera settings did you use?',
        timestamp: '20h',
        likeCount: 3,
        isLiked: false,
      },
    ],
  },
  {
    id: 'c2',
    author: {
      id: 'u2',
      username: 'wanderer_soul',
      avatarUrl: 'https://picsum.photos/seed/cu2/40/40',
      isVerified: true,
    },
    text: 'Adding this to my bucket list right now! How long was the hike?',
    timestamp: '1d',
    likeCount: 28,
    isLiked: false,
    replies: [
      {
        id: 'r3',
        author: {
          id: 'author-1',
          username: 'nature_photography',
          avatarUrl: 'https://picsum.photos/seed/postauthor/40/40',
          isVerified: true,
        },
        text: 'About 8 miles round trip. Totally worth it!',
        timestamp: '22h',
        likeCount: 8,
        isLiked: false,
      },
    ],
  },
  {
    id: 'c3',
    author: {
      id: 'u3',
      username: 'outdoor_addict',
      avatarUrl: 'https://picsum.photos/seed/cu3/40/40',
      isVerified: false,
    },
    text: 'I was there last summer! The trails are incredible during sunrise.',
    timestamp: '18h',
    likeCount: 15,
    isLiked: false,
    replies: [],
  },
  {
    id: 'c4',
    author: {
      id: 'u4',
      username: 'minimal_vibes',
      avatarUrl: 'https://picsum.photos/seed/cu4/40/40',
      isVerified: false,
    },
    text: 'The composition in these shots is chefs kiss',
    timestamp: '12h',
    likeCount: 9,
    isLiked: false,
    replies: [],
  },
  {
    id: 'c5',
    author: {
      id: 'u6',
      username: 'travel_buddy',
      avatarUrl: 'https://picsum.photos/seed/cu6/40/40',
      isVerified: false,
    },
    text: 'Can we plan a trip here together? This looks amazing!',
    timestamp: '8h',
    likeCount: 6,
    isLiked: false,
    replies: [],
  },
  {
    id: 'c6',
    author: {
      id: 'u7',
      username: 'camera_daily',
      avatarUrl: 'https://picsum.photos/seed/cu7/40/40',
      isVerified: true,
    },
    text: 'Your work never ceases to amaze me. Pure talent!',
    timestamp: '5h',
    likeCount: 22,
    isLiked: false,
    replies: [],
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PostDetailPage: React.FC = () => {
  const [post, setPost] = useState<PostData | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [liked, setLiked] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [showAllComments, setShowAllComments] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showLikeAnimation, setShowLikeAnimation] = useState<boolean>(false);
  const [expandedCaption, setExpandedCaption] = useState<boolean>(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  const commentInputRef = useRef<HTMLInputElement>(null);

  // Load post data
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 500));
        const postData = generatePost();
        setPost(postData);
        setLiked(postData.isLiked);
        setSaved(postData.isSaved);
        setComments(generateComments());
      } catch (err) {
        setError('Failed to load post.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Carousel navigation
  const handlePrevImage = useCallback(() => {
    setCurrentImageIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNextImage = useCallback(() => {
    if (!post) return;
    setCurrentImageIndex((prev) => Math.min(post.media.length - 1, prev + 1));
  }, [post]);

  // Double-tap like
  const handleDoubleTap = useCallback(() => {
    setLiked(true);
    setShowLikeAnimation(true);
    setTimeout(() => setShowLikeAnimation(false), 1000);
  }, []);

  // Like toggle
  const handleLikeToggle = useCallback(() => {
    setLiked((prev) => !prev);
  }, []);

  // Save toggle
  const handleSaveToggle = useCallback(() => {
    setSaved((prev) => !prev);
  }, []);

  // Comment actions
  const handlePostComment = useCallback(() => {
    if (!newComment.trim()) return;
    const comment: PostComment = {
      id: `c-${Date.now()}`,
      author: {
        id: 'me',
        username: 'you',
        avatarUrl: 'https://picsum.photos/seed/me/40/40',
        isVerified: false,
      },
      text: newComment,
      timestamp: 'now',
      likeCount: 0,
      isLiked: false,
      replies: [],
    };
    setComments((prev) => [comment, ...prev]);
    setNewComment('');
  }, [newComment]);

  const handleLikeComment = useCallback((commentId: string) => {
    setLikedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const handleToggleReplies = useCallback((commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  }, []);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  };

  const renderCaption = (text: string): React.ReactNode => {
    const parts = text.split(/(@\w+|#\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@'))
        return (
          <span key={i} className="text-blue-500 font-medium">
            {part}
          </span>
        );
      if (part.startsWith('#'))
        return (
          <span key={i} className="text-blue-500">
            {part}
          </span>
        );
      return <span key={i}>{part}</span>;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading post...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !post) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <p className="text-white text-center">{error || 'Post not found'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const displayedComments = showAllComments ? comments : comments.slice(0, 4);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="p-1 hover:bg-gray-800 rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="font-semibold">Post</span>
        <button className="p-1 hover:bg-gray-800 rounded-full">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </button>
      </header>

      {/* Post Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden">
            <img
              src={post.author.avatarUrl}
              alt={post.author.username}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold">{post.author.username}</span>
              {post.author.isVerified && (
                <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                </svg>
              )}
            </div>
            {post.location && <span className="text-xs text-gray-400">{post.location}</span>}
          </div>
        </div>
        <button className="p-2 hover:bg-gray-800 rounded-full">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Image Carousel */}
      <div className="relative aspect-square bg-gray-900" onDoubleClick={handleDoubleTap}>
        <img
          src={post.media[currentImageIndex]?.url}
          alt={post.media[currentImageIndex]?.altText || ''}
          className="w-full h-full object-cover"
        />

        {/* Like animation */}
        {showLikeAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              className="w-20 h-20 text-white animate-ping"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
        )}

        {/* Navigation arrows */}
        {post.media.length > 1 && (
          <>
            {currentImageIndex > 0 && (
              <button
                onClick={handlePrevImage}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
              >
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            {currentImageIndex < post.media.length - 1 && (
              <button
                onClick={handleNextImage}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg"
              >
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {post.media.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-blue-500 scale-125' : 'bg-white/50'}`}
                />
              ))}
            </div>
            {/* Counter */}
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
              {currentImageIndex + 1}/{post.media.length}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-4">
          <button onClick={handleLikeToggle} className="hover:opacity-70 transition-opacity">
            <svg
              className={`w-6 h-6 ${liked ? 'text-red-500 fill-current' : ''}`}
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
          <button
            onClick={() => commentInputRef.current?.focus()}
            className="hover:opacity-70 transition-opacity"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
          <button className="hover:opacity-70 transition-opacity">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <button onClick={handleSaveToggle} className="hover:opacity-70 transition-opacity">
          <svg
            className={`w-6 h-6 ${saved ? 'fill-current text-white' : ''}`}
            fill={saved ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
        </button>
      </div>

      {/* Like Count */}
      <div className="px-4 mt-2">
        <span className="text-sm font-semibold">
          {formatCount(post.likeCount + (liked ? 1 : 0))} likes
        </span>
      </div>

      {/* Caption */}
      <div className="px-4 mt-2">
        <p className="text-sm">
          <span className="font-semibold mr-1">{post.author.username}</span>
          {expandedCaption ? (
            renderCaption(post.caption)
          ) : (
            <>
              {renderCaption(post.caption.slice(0, 120))}
              {post.caption.length > 120 && (
                <button onClick={() => setExpandedCaption(true)} className="text-gray-400 ml-1">
                  ...more
                </button>
              )}
            </>
          )}
        </p>
      </div>

      {/* Comments */}
      <div className="px-4 mt-3">
        {!showAllComments && comments.length > 4 && (
          <button
            onClick={() => setShowAllComments(true)}
            className="text-sm text-gray-400 hover:text-gray-300 mb-3"
          >
            View all {comments.length} comments
          </button>
        )}

        <div className="space-y-4">
          {displayedComments.map((comment) => (
            <div key={comment.id}>
              <div className="flex gap-3">
                <img
                  src={comment.author.avatarUrl}
                  alt=""
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold mr-1">{comment.author.username}</span>
                    {comment.author.isVerified && (
                      <svg
                        className="w-3 h-3 text-blue-500 inline mr-1"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                      </svg>
                    )}
                    <span className="text-gray-300">{comment.text}</span>
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{comment.timestamp}</span>
                    <span className="text-xs text-gray-500">
                      {comment.likeCount + (likedComments.has(comment.id) ? 1 : 0)} likes
                    </span>
                    <button className="text-xs text-gray-500 hover:text-white font-medium">
                      Reply
                    </button>
                  </div>

                  {/* Replies */}
                  {comment.replies.length > 0 && (
                    <div className="mt-2">
                      {!expandedReplies.has(comment.id) ? (
                        <button
                          onClick={() => handleToggleReplies(comment.id)}
                          className="text-xs text-gray-400 flex items-center gap-2"
                        >
                          <span className="w-6 h-px bg-gray-600" />
                          View {comment.replies.length}{' '}
                          {comment.replies.length === 1 ? 'reply' : 'replies'}
                        </button>
                      ) : (
                        <div className="space-y-3 mt-2">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex gap-2">
                              <img
                                src={reply.author.avatarUrl}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                              />
                              <div>
                                <p className="text-sm">
                                  <span className="font-semibold mr-1">
                                    {reply.author.username}
                                  </span>
                                  {reply.author.isVerified && (
                                    <svg
                                      className="w-3 h-3 text-blue-500 inline mr-1"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                                    </svg>
                                  )}
                                  <span className="text-gray-300">{reply.text}</span>
                                </p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  <span className="text-xs text-gray-500">{reply.timestamp}</span>
                                  <span className="text-xs text-gray-500">
                                    {reply.likeCount} likes
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          <button
                            onClick={() => handleToggleReplies(comment.id)}
                            className="text-xs text-gray-400"
                          >
                            Hide replies
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleLikeComment(comment.id)}
                  className="flex-shrink-0 pt-1"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${likedComments.has(comment.id) ? 'text-red-500 fill-current' : 'text-gray-500'}`}
                    fill={likedComments.has(comment.id) ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Timestamp */}
      <div className="px-4 mt-3 mb-4">
        <span className="text-xs text-gray-500 uppercase">{post.timestamp}</span>
      </div>

      {/* Add Comment Input */}
      <div className="sticky bottom-0 bg-black border-t border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0" />
        <input
          ref={commentInputRef}
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
          placeholder="Add a comment..."
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
        />
        {newComment.trim() && (
          <button
            onClick={handlePostComment}
            className="text-blue-500 font-semibold text-sm hover:text-blue-400"
          >
            Post
          </button>
        )}
      </div>
    </div>
  );
};

export default PostDetailPage;
