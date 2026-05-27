// ============================================================================
// QuantTube - Home Page
// Video platform home with category tabs, video grid, infinite scroll
// ============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useVideos } from '../hooks/useVideos';

interface Category {
  id: string;
  label: string;
}

const CATEGORIES: Category[] = [
  { id: 'all', label: 'All' },
  { id: 'music', label: 'Music' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'news', label: 'News' },
  { id: 'sports', label: 'Sports' },
  { id: 'education', label: 'Education' },
  { id: 'entertainment', label: 'Entertainment' },
  { id: 'tech', label: 'Technology' },
];

const HomePage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categoryParam = activeCategory === 'all' ? undefined : activeCategory;
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useVideos(categoryParam);

  const videos = useMemo(() => {
    return data?.pages?.flatMap((page) => page.videos) ?? [];
  }, [data]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      if (
        target.scrollHeight - target.scrollTop - target.clientHeight < 400 &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const formatViews = useCallback((views: number): string => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  }, []);

  const formatDuration = useCallback((seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  if (isLoading && videos.length === 0) {
    return <LoadingState variant="skeleton" text="Loading videos..." />;
  }

  if (error && videos.length === 0) {
    return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  }

  return (
    <div className="home-page" onScroll={handleScroll}>
      {/* Category Tabs */}
      <div className="category-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      <div className="video-grid">
        {videos.length === 0 ? (
          <EmptyState title="No videos found" description="Try a different category" />
        ) : (
          videos.map(
            (video: {
              id: string;
              title?: string;
              thumbnail?: string;
              channelName?: string;
              channelAvatar?: string;
              views?: number;
              uploadedAt?: string;
              duration?: number;
              isLive?: boolean;
            }) => (
              <div
                key={video.id}
                className="video-card"
                onClick={() => {
                  window.location.href = `/watch/${video.id}`;
                }}
              >
                <div className="video-thumbnail">
                  <img src={video.thumbnail} alt={video.title} />
                  {video.isLive ? (
                    <span className="live-badge">LIVE</span>
                  ) : (
                    <span className="duration-badge">{formatDuration(video.duration || 0)}</span>
                  )}
                </div>
                <div className="video-info">
                  <img
                    className="channel-avatar"
                    src={video.channelAvatar}
                    alt={video.channelName}
                  />
                  <div className="video-meta">
                    <h3 className="video-title">{video.title}</h3>
                    <span className="channel-name">{video.channelName}</span>
                    <span className="video-stats">
                      {formatViews(video.views || 0)} · {video.uploadedAt}
                    </span>
                  </div>
                </div>
              </div>
            ),
          )
        )}
      </div>

      {isFetchingNextPage && (
        <div className="loading-more">
          <LoadingState variant="dots" text="Loading more..." size="sm" />
        </div>
      )}
    </div>
  );
};

export default HomePage;
