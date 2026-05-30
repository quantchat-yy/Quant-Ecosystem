// ============================================================================
// QuantNeon - Post Detail Page
// ============================================================================

import React from 'react';
import { useRouter } from 'next/router';
import { LoadingState, ErrorState, EmptyState, PageTransition } from '@quant/shared-ui';
import { usePost } from '../../hooks/usePost';

const PostDetailPage: React.FC = () => {
  const router = useRouter();
  const id = (router.query.id as string) || '';
  const { data: post, isLoading, error, refetch } = usePost(id);

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
  if (!post) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center">
          <EmptyState title="Post not found" description="This post may have been deleted" />
        </div>
      </PageTransition>
    );
  }

  const p = post as {
    id: string;
    authorUsername?: string;
    authorAvatar?: string;
    mediaUrls?: string[];
    caption?: string;
    likeCount?: number;
    commentCount?: number;
    createdAt?: string;
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-white dark:bg-[#0F0F14] text-gray-900 dark:text-gray-100">
        <div className="px-4 max-w-2xl mx-auto py-6">
          <div className="flex items-center gap-3 mb-4">
            <img
              className="w-10 h-10 rounded-full object-cover"
              src={p.authorAvatar}
              alt={p.authorUsername}
            />
            <span className="font-semibold">{p.authorUsername}</span>
          </div>
          <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
            {p.mediaUrls && p.mediaUrls.length > 0 && (
              <img className="w-full aspect-square object-cover" src={p.mediaUrls[0]} alt="Post" />
            )}
          </div>
          <p className="font-semibold text-sm mb-1">{(p.likeCount || 0).toLocaleString()} likes</p>
          <p className="text-sm">
            <strong>{p.authorUsername}</strong> {p.caption}
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-2 block">
            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {p.commentCount || 0} comments
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default PostDetailPage;
