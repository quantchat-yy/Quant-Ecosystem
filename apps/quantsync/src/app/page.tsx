'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Avatar,
  LoadingState,
  ErrorState,
  EmptyState,
  StaggerList,
  PageTransition,
  SpringButton,
  Skeleton,
} from '@quant/shared-ui';
import { motion, AnimatePresence } from 'framer-motion';
import { quantSyncAPI } from '../services/api-client';
import type { Post, FeedMode } from '../types';

const FEED_MODES: { id: FeedMode; label: string }[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' },
];

function PostSkeleton() {
  return (
    <Card className="p-4 mb-3">
      <div className="flex items-start gap-3">
        <Skeleton variant="circle" width="48px" height="48px" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton variant="text" width="120px" height="16px" />
            <Skeleton variant="text" width="80px" height="14px" />
          </div>
          <Skeleton variant="rect" width="100%" height="60px" />
          <div className="flex items-center gap-4 mt-3">
            <Skeleton variant="text" width="60px" height="14px" />
            <Skeleton variant="text" width="60px" height="14px" />
            <Skeleton variant="text" width="60px" height="14px" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function FeedPostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const [localLiked, setLocalLiked] = useState(post.userVote === 'up');
  const [localLikes, setLocalLikes] = useState(post.upvotes);
  const [localReposted, setLocalReposted] = useState(!!post.userReposted);
  const [localReposts, setLocalReposts] = useState(post.repostCount);
  const [localBookmarked, setLocalBookmarked] = useState(!!post.userBookmarked);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  const likeMutation = useMutation({
    mutationFn: () => quantSyncAPI.upvote(post.id, 'post'),
    onError: () => {
      setLocalLiked(!localLiked);
      setLocalLikes(localLiked ? localLikes + 1 : localLikes - 1);
    },
  });

  const repostMutation = useMutation({
    mutationFn: () => quantSyncAPI.repost(post.id),
    onError: () => {
      setLocalReposted(!localReposted);
      setLocalReposts(localReposted ? localReposts + 1 : localReposts - 1);
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: () => quantSyncAPI.bookmark(post.id),
    onError: () => {
      setLocalBookmarked(!localBookmarked);
    },
  });

  const handleLike = useCallback(() => {
    const wasLiked = localLiked;
    setLocalLiked(!wasLiked);
    setLocalLikes(wasLiked ? localLikes - 1 : localLikes + 1);
    if (!wasLiked) {
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 400);
    }
    likeMutation.mutate();
  }, [localLiked, localLikes, likeMutation]);

  const handleRepost = useCallback(() => {
    const wasReposted = localReposted;
    setLocalReposted(!wasReposted);
    setLocalReposts(wasReposted ? localReposts - 1 : localReposts + 1);
    repostMutation.mutate();
  }, [localReposted, localReposts, repostMutation]);

  const handleBookmark = useCallback(() => {
    setLocalBookmarked(!localBookmarked);
    bookmarkMutation.mutate();
  }, [localBookmarked, bookmarkMutation]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/post/${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    });
  }, [post.id]);

  const formatCount = (n: number): string => {
    if (n === 0) return '';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  return (
    <Card className="p-4 mb-3 bg-white dark:bg-[var(--quant-card)] border dark:border-gray-800 relative">
      <div className="flex items-start gap-3">
        <Avatar src={post.author?.avatar} alt={post.author?.displayName || 'User'} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate text-gray-900 dark:text-gray-100">
              {post.author?.displayName || 'Anonymous'}
            </span>
            {post.author?.verified && <span className="text-blue-500 text-xs">&#x2713;</span>}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              @{post.author?.username || 'anon'}
            </span>
          </div>
          <p className="mt-1 text-sm whitespace-pre-wrap text-gray-900 dark:text-gray-100">
            {post.content}
          </p>
          {post.mediaAttachments && post.mediaAttachments.length > 0 && (
            <div
              className={`mt-2 rounded-xl overflow-hidden border dark:border-gray-700 ${post.mediaAttachments.length > 1 ? 'grid grid-cols-2 gap-0.5' : ''}`}
            >
              {post.mediaAttachments.slice(0, 4).map((media, idx) => (
                <div
                  key={media.id || idx}
                  className={`relative ${post.mediaAttachments.length === 1 ? 'aspect-video' : 'aspect-square'} bg-gray-100 dark:bg-gray-800`}
                >
                  <img
                    src={media.url}
                    alt={media.altText || ''}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-3 -ml-2 max-w-md">
            {/* Comment */}
            <SpringButton className="flex items-center gap-1 min-h-[44px] min-w-[44px] text-gray-500 dark:text-gray-400 hover:text-blue-500 px-2 py-1 rounded group">
              <span className="p-1.5 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 text-sm">
                &#x1F4AC;
              </span>
              <span className="text-xs">{formatCount(post.commentCount)}</span>
            </SpringButton>
            {/* Repost */}
            <SpringButton
              onClick={handleRepost}
              className={`flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 py-1 rounded group ${localReposted ? 'text-green-500' : 'text-gray-500 dark:text-gray-400 hover:text-green-500'}`}
            >
              <span className="p-1.5 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-900/20 text-sm">
                &#x1F504;
              </span>
              <span className="text-xs">{formatCount(localReposts)}</span>
            </SpringButton>
            {/* Like */}
            <SpringButton
              onClick={handleLike}
              className={`flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 py-1 rounded group ${localLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-red-500'}`}
            >
              <motion.span
                animate={likeAnimating ? { scale: [1, 1.4, 1] } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                className="p-1.5 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-900/20 text-sm"
              >
                {localLiked ? '\u2764\uFE0F' : '\uD83E\uDD0D'}
              </motion.span>
              <span className="text-xs">{formatCount(localLikes)}</span>
            </SpringButton>
            {/* Bookmark */}
            <SpringButton
              onClick={handleBookmark}
              className={`flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 py-1 rounded group ${localBookmarked ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400 hover:text-blue-500'}`}
            >
              <span className="p-1.5 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 text-sm">
                {localBookmarked ? '\uD83D\uDD16' : '\uD83D\uDCD1'}
              </span>
            </SpringButton>
            {/* Share */}
            <SpringButton
              onClick={handleShare}
              className="min-h-[44px] min-w-[44px] px-2 py-1 rounded text-gray-500 dark:text-gray-400 hover:text-blue-500 text-sm"
            >
              &#x2197;&#xFE0F;
            </SpringButton>
          </div>
        </div>
      </div>
      {/* Share toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg"
          >
            Link copied to clipboard
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function FeedPage() {
  const [activeMode, setActiveMode] = useState<FeedMode>('for-you');
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['feed', activeMode],
    queryFn: async () => {
      const response = await quantSyncAPI.getFeed(activeMode);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load feed');
      }
      return response.data || [];
    },
  });

  // Reset posts when mode changes or fresh data arrives
  useEffect(() => {
    if (data) {
      setPosts(data);
      setCursor(data.length > 0 ? data[data.length - 1]?.id : undefined);
      setHasMore(data.length >= 10);
    }
  }, [data]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const response = await quantSyncAPI.getFeed(activeMode, cursor, 10);
      if (response.success && response.data) {
        const newPosts = response.data;
        if (newPosts.length === 0) {
          setHasMore(false);
        } else {
          setPosts((prev) => [...prev, ...newPosts]);
          setCursor(newPosts[newPosts.length - 1]?.id);
          if (newPosts.length < 10) setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
    } catch {
      // Stop trying on error
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [activeMode, cursor, hasMore, loadingMore]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  return (
    <PageTransition>
      <main className="max-w-2xl mx-auto px-4 py-6 min-h-screen bg-[var(--quant-background)] text-[var(--quant-foreground)]">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Feed</h1>
          <a href="/compose">
            <SpringButton className="min-h-[44px] px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg">
              Compose
            </SpringButton>
          </a>
        </div>

        <div className="relative flex gap-1 mb-6 p-1 rounded-lg bg-[var(--quant-muted)]">
          {FEED_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActiveMode(mode.id)}
              className={`relative flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors min-h-[44px] ${
                activeMode === mode.id
                  ? 'text-[var(--quant-foreground)]'
                  : 'text-[var(--quant-muted-foreground)] hover:text-[var(--quant-foreground)]'
              }`}
            >
              {activeMode === mode.id && (
                <motion.div
                  layoutId="feed-indicator"
                  className="absolute inset-0 bg-[var(--quant-background)] rounded-md shadow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{mode.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </motion.div>
          )}

          {isError && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ErrorState
                message={error instanceof Error ? error.message : 'Failed to load feed'}
                onRetry={() => refetch()}
              />
            </motion.div>
          )}

          {!isLoading && !isError && posts.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState
                title="No posts yet"
                description="Follow some people or check out trending topics to see posts here!"
              />
            </motion.div>
          )}

          {!isLoading && !isError && posts.length > 0 && (
            <motion.div
              key="posts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <StaggerList className="space-y-3">
                {posts.map((post) => (
                  <FeedPostCard key={post.id} post={post} />
                ))}
              </StaggerList>
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="py-4">
                {loadingMore && (
                  <div className="flex justify-center">
                    <LoadingState variant="dots" text="Loading more..." size="sm" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  );
}
