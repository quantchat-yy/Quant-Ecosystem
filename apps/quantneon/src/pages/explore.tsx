// ============================================================================
// QuantNeon - Explore/Discover Page
// Search, categories, mixed-size grid, trending
// ============================================================================

import React, { useState } from 'react';
import { PageTransition, ErrorState, EmptyState } from '@quant/shared-ui';
import { useExplore } from '../hooks/useExplore';

function ExploreSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

const ExplorePage: React.FC = () => {
  const { data, isLoading, error, refetch } = useExplore();
  const [searchQuery, setSearchQuery] = useState('');

  if (error) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center px-4">
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        </div>
      </PageTransition>
    );
  }

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
    <PageTransition>
      <div className="min-h-screen bg-white dark:bg-[#0F0F14] text-gray-900 dark:text-gray-100">
        <div className="px-4 max-w-7xl mx-auto py-4">
          <div className="mb-4">
            <input
              className="h-11 w-full rounded-xl bg-gray-100 dark:bg-gray-800 px-4 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <ExploreSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState title="Nothing found" description="Try a different search term" />
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {filtered.map((post) => (
                <div
                  key={post.id}
                  className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800"
                >
                  <img
                    className="w-full h-full object-cover hover:scale-[1.02] transition-transform"
                    src={post.thumbnailUrl}
                    alt=""
                    loading="lazy"
                  />
                  {post.type === 'video' && (
                    <span className="absolute top-2 right-2 text-white drop-shadow-lg text-sm">
                      ▶
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default ExplorePage;
