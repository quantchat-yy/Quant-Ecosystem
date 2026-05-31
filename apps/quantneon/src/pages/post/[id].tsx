// ============================================================================
// QuantNeon - Post Detail Page
// Image carousel, action bar, caption with @mentions, comments, double-tap like
// ============================================================================

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { useRouter } from 'next/router';
import { LoadingState, ErrorState, EmptyState, PageTransition } from '@quant/shared-ui';
import { usePost } from '../../hooks/usePost';
import type { Post } from '../../types';

interface Comment {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  timeAgo: string;
  likeCount: number;
  isLiked: boolean;
  replies: Comment[];
}

const PostDetailPage: React.FC = () => {
  const router = useRouter();
  const id = (router.query.id as string) || '';
  const { data: post, isLoading, error, refetch } = usePost(id);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [expandCaption, setExpandCaption] = useState(false);

  const lastTapRef = useRef<number>(0);
  const touchStartX = useRef<number>(0);

  const p = post as Post | undefined;

  // Initialize like count from data
  React.useEffect(() => {
    if (p) {
      setLikeCount(p.likeCount || p.likes || 0);
      setIsLiked(p.isLiked || false);
    }
  }, [post]);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (!isLiked) {
        setIsLiked(true);
        setLikeCount((prev) => prev + 1);
      }
      setShowHeartAnim(true);
      setTimeout(() => setShowHeartAnim(false), 1000);
    }
    lastTapRef.current = now;
  }, [isLiked]);

  const handleLike = useCallback(() => {
    setIsLiked((prev) => !prev);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
  }, [isLiked]);

  const handleImageSwipe = useCallback(
    (e: React.TouchEvent) => {
      const diffX = touchStartX.current - e.changedTouches[0].clientX;
      if (!p) return;
      const urls = p.mediaUrls || p.media?.map((m) => m.url) || [];
      const imgCount = urls.length || 1;
      if (Math.abs(diffX) > 50) {
        if (diffX > 0 && currentImageIndex < imgCount - 1) {
          setCurrentImageIndex((prev) => prev + 1);
        } else if (diffX < 0 && currentImageIndex > 0) {
          setCurrentImageIndex((prev) => prev - 1);
        }
      }
    },
    [currentImageIndex, p],
  );

  const handleSubmitComment = useCallback(() => {
    if (!commentText.trim()) return;
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      username: 'you',
      avatarUrl: '/avatars/me.jpg',
      text: commentText,
      timeAgo: 'just now',
      likeCount: 0,
      isLiked: false,
      replies: [],
    };
    setComments((prev) => [newComment, ...prev]);
    setCommentText('');
  }, [commentText]);

  const renderCaption = useCallback((text: string) => {
    return text.split(/(@\w+)/g).map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-purple-500 font-medium">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  }, []);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center">
          <LoadingState variant="skeleton" text="Loading post..." />
        </div>
      </PageTransition>
    );
  }
  if (error) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center">
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        </div>
      </PageTransition>
    );
  }
  if (!p) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center">
          <EmptyState title="Post not found" description="This post may have been deleted" />
        </div>
      </PageTransition>
    );
  }

  const mediaUrls = p.mediaUrls || p.media?.map((m) => m.url) || [];
  const authorUsername = p.authorUsername || p.username || 'user';
  const authorAvatar = p.authorAvatar || p.userAvatar || '';
  const totalImages = mediaUrls.length || 1;

  return (
    <PageTransition>
      <div className="min-h-screen bg-white dark:bg-[#0F0F14] text-gray-900 dark:text-gray-100">
        <div className="max-w-2xl mx-auto">
          {/* Author Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <img
              className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-700"
              src={authorAvatar}
              alt={authorUsername}
            />
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm">{authorUsername}</span>
            </div>
            <button
              className="ml-auto text-gray-500 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="More options"
            >
              &#8943;
            </button>
          </div>

          {/* Image Carousel */}
          <div
            className="relative w-full aspect-square bg-gray-100 dark:bg-gray-900 overflow-hidden"
            onClick={handleDoubleTap}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0].clientX;
            }}
            onTouchEnd={handleImageSwipe}
            role="region"
            aria-label="Post images"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentImageIndex}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0.5 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full object-cover"
                src={mediaUrls[currentImageIndex] || mediaUrls[0]}
                alt={`Post image ${currentImageIndex + 1}`}
              />
            </AnimatePresence>

            {/* Double-tap heart animation */}
            <AnimatePresence>
              {showHeartAnim && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1.3, opacity: 1 }}
                  exit={{ scale: 1.5, opacity: 0 }}
                  transition={{ type: 'spring', ...spring.bouncy }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <span className="text-7xl text-white drop-shadow-2xl">&#10084;</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dot Indicators */}
            {totalImages > 1 && (
              <div
                className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5"
                role="tablist"
                aria-label="Image indicators"
              >
                {Array.from({ length: totalImages }).map((_, i) => (
                  <button
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === currentImageIndex ? 'bg-purple-500' : 'bg-white/50'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(i);
                    }}
                    role="tab"
                    aria-selected={i === currentImageIndex}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex items-center px-4 py-3">
            <div className="flex items-center gap-4">
              <button
                className={`min-w-[44px] min-h-[44px] flex items-center justify-center ${isLiked ? 'text-red-500' : ''}`}
                onClick={handleLike}
                aria-label={isLiked ? 'Unlike' : 'Like'}
                aria-pressed={isLiked}
              >
                <motion.span
                  animate={isLiked ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                  className="text-2xl"
                >
                  {isLiked ? '\u2764' : '\u2661'}
                </motion.span>
              </button>
              <button
                className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Comments"
              >
                <span className="text-2xl">&#128172;</span>
              </button>
              <button
                className="min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Share"
              >
                <span className="text-2xl">&#10148;</span>
              </button>
            </div>
            <button
              className={`ml-auto min-w-[44px] min-h-[44px] flex items-center justify-center ${isBookmarked ? 'text-yellow-500' : ''}`}
              onClick={() => setIsBookmarked(!isBookmarked)}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
              aria-pressed={isBookmarked}
            >
              <span className="text-2xl">{isBookmarked ? '\u{1F516}' : '\u{1F3F7}'}</span>
            </button>
          </div>

          {/* Like Count */}
          <div className="px-4 mb-2">
            <span className="font-semibold text-sm">{likeCount.toLocaleString()} likes</span>
          </div>

          {/* Caption with @mentions */}
          <div className="px-4 mb-3">
            <p className="text-sm">
              <strong className="mr-1">{authorUsername}</strong>
              <span className={!expandCaption ? 'line-clamp-2' : ''}>
                {renderCaption(p.caption || '')}
              </span>
            </p>
            {(p.caption || '').length > 100 && !expandCaption && (
              <button
                className="text-sm text-gray-500 dark:text-gray-400 mt-0.5"
                onClick={() => setExpandCaption(true)}
              >
                more
              </button>
            )}
          </div>

          {/* Comments Section */}
          <div className="px-4 border-t border-gray-100 dark:border-gray-800 pt-3">
            {comments.length === 0 && p.commentCount > 0 && (
              <button className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                View all {p.commentCount} comments
              </button>
            )}

            <div
              className="space-y-4 max-h-[40vh] overflow-y-auto"
              role="list"
              aria-label="Comments"
            >
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-2.5" role="listitem">
                  <img
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    src={comment.avatarUrl}
                    alt={comment.username}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <strong className="mr-1">{comment.username}</strong>
                      {comment.text}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{comment.timeAgo}</span>
                      <button className="text-xs text-gray-500 font-medium">
                        {comment.likeCount > 0 ? `${comment.likeCount} likes` : 'Like'}
                      </button>
                      <button className="text-xs text-gray-500 font-medium">Reply</button>
                    </div>
                    {/* Nested replies */}
                    {comment.replies.length > 0 && (
                      <div className="mt-3 space-y-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-2">
                            <img
                              className="w-6 h-6 rounded-full object-cover"
                              src={reply.avatarUrl}
                              alt={reply.username}
                            />
                            <div>
                              <p className="text-sm">
                                <strong className="mr-1">{reply.username}</strong>
                                {reply.text}
                              </p>
                              <span className="text-xs text-gray-500">{reply.timeAgo}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Input */}
            <div className="flex items-center gap-2 py-3 mt-3 border-t border-gray-100 dark:border-gray-800">
              <input
                className="flex-1 text-sm bg-transparent placeholder-gray-400 focus:outline-none"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                aria-label="Add comment"
              />
              {commentText.trim() && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-sm font-semibold text-purple-500"
                  onClick={handleSubmitComment}
                >
                  Post
                </motion.button>
              )}
            </div>
          </div>

          {/* Timestamp */}
          <div className="px-4 pb-4">
            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              {p.createdAt
                ? new Date(p.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : ''}
            </span>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default PostDetailPage;
