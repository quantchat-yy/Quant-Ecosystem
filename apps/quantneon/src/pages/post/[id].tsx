// ============================================================================
// QuantNeon - Post Detail Page
// ============================================================================

import React from 'react';
import { useRouter } from 'next/router';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { usePost } from '../../hooks/usePost';

const PostDetailPage: React.FC = () => {
  const router = useRouter();
  const id = (router.query.id as string) || '';
  const { data: post, isLoading, error, refetch } = usePost(id);

  if (isLoading) return <LoadingState variant="skeleton" text="Loading post..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (!post)
    return <EmptyState title="Post not found" description="This post may have been deleted" />;

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
    <div className="post-detail-page">
      <div className="post-header">
        <img className="author-avatar" src={p.authorAvatar} alt={p.authorUsername} />
        <span className="author-name">{p.authorUsername}</span>
      </div>
      <div className="post-media">
        {p.mediaUrls && p.mediaUrls.length > 0 && (
          <img className="post-image" src={p.mediaUrls[0]} alt="Post" />
        )}
      </div>
      <div className="post-actions">
        <span className="like-count">{(p.likeCount || 0).toLocaleString()} likes</span>
      </div>
      <div className="post-caption">
        <strong>{p.authorUsername}</strong> {p.caption}
      </div>
      <span className="post-date">
        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
      </span>
      <div className="post-comments">
        <span>{p.commentCount || 0} comments</span>
      </div>
    </div>
  );
};

export default PostDetailPage;
