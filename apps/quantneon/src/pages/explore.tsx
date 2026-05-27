// ============================================================================
// QuantNeon - Explore/Discover Page
// Search, categories, mixed-size grid, trending
// ============================================================================

import React, { useState } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useExplore } from '../hooks/useExplore';

const ExplorePage: React.FC = () => {
  const { data, isLoading, error, refetch } = useExplore();
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) return <LoadingState variant="skeleton" text="Loading explore..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  const posts: {
    id: string;
    thumbnailUrl?: string;
    type?: string;
    likeCount?: number;
    username?: string;
  }[] = (data ?? []) as any[];

  const filtered = searchQuery
    ? posts.filter((p) => p.username?.toLowerCase().includes(searchQuery.toLowerCase()))
    : posts;

  return (
    <div className="explore-page">
      <div className="explore-search">
        <input
          className="search-input"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="explore-grid">
        {filtered.length === 0 ? (
          <EmptyState title="Nothing found" description="Try a different search term" />
        ) : (
          filtered.map((post) => (
            <div key={post.id} className="explore-item">
              <img className="explore-thumb" src={post.thumbnailUrl} alt="" />
              {post.type === 'video' && <span className="video-indicator">▶</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
