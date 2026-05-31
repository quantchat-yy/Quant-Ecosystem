// ============================================================================
// QuantNeon - Explore/Discover Page
// Search, categories, mixed-size grid, trending
// ============================================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { spring } from '@quant/brand';
import { PageTransition, ErrorState, EmptyState } from '@quant/shared-ui';
import { useExplore } from '../hooks/useExplore';

function ExploreSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="aspect-square bg-[var(--quant-muted)] rounded-lg animate-pulse" />
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
      <div className="min-h-screen bg-[var(--quant-background)] text-[var(--quant-foreground)]">
        <div className="px-4 max-w-7xl mx-auto py-4">
          <div className="mb-4">
            <input
              className="h-11 w-full rounded-xl bg-[var(--quant-card)] border border-[var(--quant-border)] px-4 text-sm text-[var(--quant-foreground)] placeholder-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-shadow"
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
            <motion.div
              className="grid grid-cols-3 gap-0.5"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.03 } },
              }}
            >
              {filtered.map((post) => (
                <motion.div
                  key={post.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: { opacity: 1, y: 0, transition: { type: 'spring', ...spring.gentle } },
                  }}
                  className="relative aspect-square overflow-hidden bg-[var(--quant-muted)]"
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
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default ExplorePage;
