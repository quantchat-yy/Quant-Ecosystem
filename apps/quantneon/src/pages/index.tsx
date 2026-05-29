// ============================================================================
// QuantNeon - Instagram-Style Feed Page
// Stories bar, posts feed, infinite scroll, pull-to-refresh
// ============================================================================

import React, { useCallback } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { sanitizeMediaUrl } from '@quant/common';
import { useFeed } from '../hooks/useFeed';

const FeedPage: React.FC = () => {
  const [state, actions] = useFeed();

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      if (target.scrollHeight - target.scrollTop - target.clientHeight < 300) {
        actions.loadMore();
      }
    },
    [actions],
  );

  if (state.loading && state.posts.length === 0 && state.stories.length === 0) {
    return <LoadingState variant="skeleton" text="Loading feed..." />;
  }

  if (state.error && state.posts.length === 0) {
    return <ErrorState message={state.error} onRetry={() => void actions.refresh()} />;
  }

  if (state.posts.length === 0 && state.stories.length === 0) {
    return (
      <EmptyState title="Your feed is empty" description="Follow people to see their posts here" />
    );
  }

  return (
    <div className="feed-page" onScroll={handleScroll}>
      {/* Stories Bar */}
      {state.stories.length > 0 && (
        <div className="stories-bar">
          {state.stories.map((user) => (
            <div
              key={user.id}
              className={`story-avatar ${user.hasUnseenStory ? 'unseen' : 'seen'}`}
              onClick={() => actions.markStorySeen(user.id)}
            >
              <img className="story-img" src={user.avatar} alt={user.username} />
              <span className="story-username">{user.username}</span>
            </div>
          ))}
        </div>
      )}

      {/* Posts Feed */}
      <div className="posts-feed">
        {state.posts.map((post) => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <img
                className="post-author-avatar"
                src={sanitizeMediaUrl(post.authorAvatar)}
                alt={post.authorUsername}
              />
              <span className="post-author-name">{post.authorUsername}</span>
            </div>
            <div className="post-media" onDoubleClick={() => actions.doubleTapLike(post.id)}>
              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <img className="post-image" src={sanitizeMediaUrl(post.mediaUrls[0])} alt="Post" />
              )}
              {state.likeAnimation === post.id && (
                <div className="like-animation">
                  <span>&#10084;</span>
                </div>
              )}
            </div>
            <div className="post-actions">
              <button
                className={`like-btn ${post.isLiked ? 'liked' : ''}`}
                onClick={() =>
                  post.isLiked ? actions.unlikePost(post.id) : actions.likePost(post.id)
                }
              >
                {post.isLiked ? '❤️' : '🤍'}
              </button>
              <button className="comment-btn">💬</button>
              <button className="share-btn">↗</button>
              <button
                className={`save-btn ${post.isSaved ? 'saved' : ''}`}
                onClick={() =>
                  post.isSaved ? actions.unsavePost(post.id) : actions.savePost(post.id)
                }
              >
                {post.isSaved ? '🔖' : '📑'}
              </button>
            </div>
            <div className="post-footer">
              <span className="like-count">{post.likeCount.toLocaleString()} likes</span>
              <p className="post-caption">
                <strong>{post.authorUsername}</strong> {post.caption}
              </p>
              {post.commentCount > 0 && (
                <span className="view-comments">View all {post.commentCount} comments</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {state.loading && state.posts.length > 0 && (
        <div className="feed-loading-more">
          <LoadingState variant="dots" text="Loading more..." size="sm" />
        </div>
      )}
    </div>
  );
};

export default FeedPage;
