'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Button, Avatar, LoadingState, ErrorState } from '@quant/shared-ui';
import { quantSyncAPI } from '../services/api-client';
import type { Post, FeedMode } from '../types';

const FEED_MODES: { id: FeedMode; label: string }[] = [
  { id: 'for-you', label: 'For You' },
  { id: 'following', label: 'Following' },
  { id: 'trending', label: 'Trending' },
];

function PostCard({ post }: { post: Post }) {
  return (
    <Card className="p-4 mb-3">
      <div className="flex items-start gap-3">
        <Avatar src={post.author?.avatar} alt={post.author?.displayName || 'User'} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {post.author?.displayName || 'Anonymous'}
            </span>
            <span className="text-xs text-[var(--quant-muted-foreground)]">
              @{post.author?.username || 'anon'}
            </span>
          </div>
          <p className="mt-1 text-sm whitespace-pre-wrap">{post.content}</p>
          <div className="flex items-center gap-4 mt-3">
            <Button variant="ghost" size="sm">
              {post.upvotes} Likes
            </Button>
            <Button variant="ghost" size="sm">
              {post.repostCount} Reposts
            </Button>
            <Button variant="ghost" size="sm">
              {post.commentCount} Comments
            </Button>
            <Button variant="ghost" size="sm">
              Bookmark
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function FeedPage() {
  const [activeMode, setActiveMode] = useState<FeedMode>('for-you');

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

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Feed</h1>
        <Button variant="primary" size="sm">
          Compose
        </Button>
      </div>

      <div className="flex gap-1 mb-6 p-1 rounded-lg bg-[var(--quant-muted)]">
        {FEED_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setActiveMode(mode.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeMode === mode.id
                ? 'bg-[var(--quant-background)] text-[var(--quant-foreground)] shadow-sm'
                : 'text-[var(--quant-muted-foreground)] hover:text-[var(--quant-foreground)]'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingState text="Loading feed..." />}

      {isError && (
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load feed'}
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[var(--quant-muted-foreground)]">
            No posts yet. Follow some people or check out trending topics!
          </p>
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div>
          {data.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </main>
  );
}
