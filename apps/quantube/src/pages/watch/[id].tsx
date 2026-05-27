// ============================================================================
// QuantTube - Video Watch Page
// Full video player with controls, comments, related videos, channel info
// ============================================================================

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useVideo } from '../../hooks/useVideo';
import { useComments } from '../../hooks/useComments';

const WatchPage: React.FC = () => {
  const router = useRouter();
  const id = (router.query.id as string) || '';
  const {
    data: video,
    isLoading: videoLoading,
    error: videoError,
    refetch: refetchVideo,
  } = useVideo(id);
  const { data: comments, isLoading: commentsLoading, error: commentsError } = useComments(id);
  const [commentText, setCommentText] = useState('');
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const formatViews = useCallback((views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  }, []);

  const formatCount = useCallback((count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  }, []);

  if (videoLoading) return <LoadingState variant="skeleton" text="Loading video..." />;
  if (videoError)
    return <ErrorState message={videoError.message} onRetry={() => void refetchVideo()} />;
  if (!video)
    return <EmptyState title="Video not found" description="This video may have been removed" />;

  const v = video as {
    id: string;
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnail?: string;
    views?: number;
    likes?: number;
    publishedAt?: string;
    channelName?: string;
    channelAvatar?: string;
    channelSubscribers?: number;
  };
  const commentList: {
    id: string;
    username?: string;
    avatar?: string;
    text?: string;
    likes?: number;
    timestamp?: string;
  }[] = (comments ?? []) as any[];

  return (
    <div className="watch-page">
      {/* Video Player */}
      <div className="video-player">
        <video className="main-video" src={v.videoUrl} poster={v.thumbnail} controls autoPlay />
      </div>

      {/* Video Info */}
      <div className="video-details">
        <h1 className="video-title">{v.title}</h1>
        <div className="video-stats">
          <span>{formatViews(v.views || 0)}</span>
          <span>{v.publishedAt}</span>
        </div>
        <div className="video-actions">
          <button className="action-btn">
            <span>👍</span>
            <span>{formatCount(v.likes || 0)}</span>
          </button>
          <button className="action-btn">
            <span>↗</span>
            <span>Share</span>
          </button>
          <button className="action-btn">
            <span>📥</span>
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Channel Info */}
      <div className="channel-bar">
        <img className="channel-avatar" src={v.channelAvatar} alt={v.channelName} />
        <div className="channel-info">
          <span className="channel-name">{v.channelName}</span>
          <span className="sub-count">{formatCount(v.channelSubscribers || 0)} subscribers</span>
        </div>
        <button className="subscribe-btn">Subscribe</button>
      </div>

      {/* Description */}
      <div className="video-description">
        <p className={isDescExpanded ? 'expanded' : 'collapsed'}>{v.description}</p>
        <button className="expand-btn" onClick={() => setIsDescExpanded(!isDescExpanded)}>
          {isDescExpanded ? 'Show less' : 'Show more'}
        </button>
      </div>

      {/* Comments */}
      <div className="comments-section">
        <h3 className="comments-title">{commentList.length} Comments</h3>
        <div className="comment-input-area">
          <input
            className="comment-input"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button className="comment-submit" disabled={!commentText.trim()}>
            Post
          </button>
        </div>
        {commentsLoading && <LoadingState variant="dots" text="Loading comments..." size="sm" />}
        {commentsError && <p className="error-text">Could not load comments</p>}
        <div className="comments-list">
          {commentList.map((comment) => (
            <div key={comment.id} className="comment-item">
              <img className="comment-avatar" src={comment.avatar} alt={comment.username} />
              <div className="comment-body">
                <span className="comment-username">{comment.username}</span>
                <p className="comment-text">{comment.text}</p>
                <div className="comment-meta">
                  <span className="comment-time">{comment.timestamp}</span>
                  <button className="comment-like">👍 {comment.likes || 0}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
