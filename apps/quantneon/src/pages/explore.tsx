// ============================================================================
// QuantNeon - Explore/Discover Page
// Category tabs, search with autocomplete, trending hashtags, masonry grid
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { spring } from '@quant/brand';
import { PageTransition, ErrorState, EmptyState } from '@quant/shared-ui';
import { useExplore } from '../hooks/useExplore';

type Category = 'For You' | 'Travel' | 'Food' | 'Art' | 'Fashion' | 'Sports' | 'Music';

const CATEGORIES: Category[] = ['For You', 'Travel', 'Food', 'Art', 'Fashion', 'Sports', 'Music'];

const TRENDING_TAGS = [
  '#SummerVibes',
  '#Photography',
  '#OOTD',
  '#FoodPorn',
  '#TravelGram',
  '#ArtOfTheDay',
  '#FitnessMotivation',
  '#Sunset',
  '#Minimal',
];

const AUTOCOMPLETE_SUGGESTIONS = [
  'sunset photography',
  'travel vlog',
  'street food',
  'modern art',
  'fashion week',
  'workout routine',
  'guitar covers',
  'home decor',
  'nature walks',
  'portrait photography',
  'cafe hopping',
];

interface ExplorePost {
  id: string;
  thumbnailUrl?: string;
  type?: string;
  likeCount?: number;
  username?: string;
  category?: string;
  span?: 'normal' | 'tall' | 'wide';
}

function ExploreSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className={`bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse ${
            i % 5 === 0
              ? 'row-span-2 aspect-[1/2]'
              : i % 7 === 0
                ? 'col-span-2 aspect-[2/1]'
                : 'aspect-square'
          }`}
        />
      ))}
    </div>
  );
}

const ExplorePage: React.FC = () => {
  const { data, isLoading, error, refetch } = useExplore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('For You');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const posts: ExplorePost[] = ((data ?? []) as unknown[]).map((item: unknown, index: number) => {
    const p = item as Record<string, unknown>;
    const spanOptions: ExplorePost['span'][] = ['normal', 'normal', 'normal', 'tall', 'wide'];
    return {
      id: (p.id as string) || `post-${index}`,
      thumbnailUrl: (p.thumbnailUrl as string) || `https://cdn.quantneon.app/explore/${index}.jpg`,
      type: (p.type as string) || (index % 4 === 0 ? 'video' : 'image'),
      likeCount: (p.likeCount as number) || Math.floor(Math.random() * 10000),
      username: (p.username as string) || `user_${index}`,
      category: (p.category as string) || CATEGORIES[index % CATEGORIES.length],
      span: spanOptions[index % spanOptions.length],
    };
  });

  const filteredByCategory = useMemo(() => {
    if (activeCategory === 'For You') return posts;
    return posts.filter((p) => p.category === activeCategory);
  }, [posts, activeCategory]);

  const filtered = useMemo(() => {
    if (!searchQuery) return filteredByCategory;
    return filteredByCategory.filter(
      (p) =>
        p.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [filteredByCategory, searchQuery]);

  const suggestions = useMemo(() => {
    if (!searchQuery) return AUTOCOMPLETE_SUGGESTIONS.slice(0, 5);
    return AUTOCOMPLETE_SUGGESTIONS.filter((s) =>
      s.toLowerCase().includes(searchQuery.toLowerCase()),
    ).slice(0, 5);
  }, [searchQuery]);

  const handleTagClick = useCallback((tag: string) => {
    setSearchQuery(tag.replace('#', ''));
    setShowSuggestions(false);
  }, []);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  }, []);

  if (error) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center px-4">
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-white dark:bg-[#0F0F14] text-gray-900 dark:text-gray-100">
        <div className="px-4 max-w-7xl mx-auto py-4">
          {/* Search Bar with Autocomplete */}
          <div className="relative mb-4">
            <input
              className="h-11 w-full rounded-xl bg-gray-100 dark:bg-gray-800 px-4 pl-10 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
              placeholder="Search people, tags, places..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => {
                setSearchFocused(true);
                setShowSuggestions(true);
              }}
              onBlur={() => {
                setTimeout(() => {
                  setSearchFocused(false);
                  setShowSuggestions(false);
                }, 200);
              }}
              aria-label="Search explore"
              role="combobox"
              aria-expanded={showSuggestions}
              aria-haspopup="listbox"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              &#128269;
            </span>
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                &#10005;
              </button>
            )}

            {/* Autocomplete Dropdown */}
            <AnimatePresence>
              {showSuggestions && searchFocused && suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: 'spring', ...spring.snappy }}
                  className="absolute top-full left-0 right-0 mt-1 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                  role="listbox"
                  aria-label="Search suggestions"
                >
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      onClick={() => handleSuggestionClick(suggestion)}
                      role="option"
                    >
                      <span className="text-gray-400">&#128269;</span>
                      {suggestion}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Category Tabs */}
          <div
            className="mb-4 -mx-4 px-4 overflow-x-auto scrollbar-hide"
            role="tablist"
            aria-label="Explore categories"
          >
            <div className="flex gap-2 pb-1">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    activeCategory === category
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => setActiveCategory(category)}
                  role="tab"
                  aria-selected={activeCategory === category}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Trending Hashtags */}
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Trending hashtags">
            {TRENDING_TAGS.map((tag) => (
              <button
                key={tag}
                className="rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Content Grid - Masonry Layout */}
          {isLoading ? (
            <ExploreSkeleton />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nothing found"
              description="Try a different search term or category"
            />
          ) : (
            <div className="grid grid-cols-3 auto-rows-[150px] gap-0.5">
              {filtered.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 rounded-sm ${
                    post.span === 'tall' ? 'row-span-2' : post.span === 'wide' ? 'col-span-2' : ''
                  }`}
                  role="article"
                  aria-label={`Post by ${post.username}`}
                >
                  <img
                    className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-300"
                    src={post.thumbnailUrl}
                    alt=""
                    loading="lazy"
                  />
                  {post.type === 'video' && (
                    <span className="absolute top-2 right-2 text-white drop-shadow-lg text-sm">
                      &#9654;
                    </span>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 text-white text-xs">
                      <span>&#10084;</span>
                      <span>{(post.likeCount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default ExplorePage;
