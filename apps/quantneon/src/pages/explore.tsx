// ============================================================================
// QuantNeon - Explore/Discover Page
// Search, categories, mixed-size grid, IGTV, shopping, trending
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExplorePost {
  id: string;
  thumbnailUrl: string;
  type: 'image' | 'video' | 'reel' | 'igtv';
  likeCount: number;
  commentCount: number;
  isMultiple: boolean;
  duration?: string;
  username: string;
}

interface SearchSuggestion {
  id: string;
  type: 'account' | 'hashtag' | 'location';
  text: string;
  subtitle: string;
  avatarUrl?: string;
}

interface TrendingHashtag {
  tag: string;
  postCount: number;
  thumbnailUrl: string;
}

interface ShoppingProduct {
  id: string;
  name: string;
  price: string;
  thumbnailUrl: string;
  brand: string;
}

type ExploreCategory = 'All' | 'Fashion' | 'Food' | 'Travel' | 'Art' | 'Music' | 'Sports' | 'Tech';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const CATEGORIES: ExploreCategory[] = ['All', 'Fashion', 'Food', 'Travel', 'Art', 'Music', 'Sports', 'Tech'];

const generateExplorePosts = (category: ExploreCategory): ExplorePost[] => {
  return Array.from({ length: 30 }, (_, i) => ({
    id: `explore-${category}-${i}`,
    thumbnailUrl: `https://picsum.photos/seed/exp${category}${i}/400/400`,
    type: (['image', 'video', 'reel', 'igtv'] as const)[i % 4],
    likeCount: Math.floor(Math.random() * 50000) + 500,
    commentCount: Math.floor(Math.random() * 2000) + 50,
    isMultiple: i % 5 === 0,
    duration: i % 4 !== 0 ? `${Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 59)).padStart(2, '0')}` : undefined,
    username: `creator_${i}`,
  }));
};

const generateSuggestions = (query: string): SearchSuggestion[] => {
  if (!query) return [];
  return [
    { id: 's1', type: 'account', text: `${query}_official`, subtitle: '1.2M followers', avatarUrl: `https://picsum.photos/seed/${query}1/40/40` },
    { id: 's2', type: 'hashtag', text: `#${query}`, subtitle: '2.5M posts' },
    { id: 's3', type: 'account', text: `${query}_art`, subtitle: '340K followers', avatarUrl: `https://picsum.photos/seed/${query}2/40/40` },
    { id: 's4', type: 'hashtag', text: `#${query}life`, subtitle: '890K posts' },
    { id: 's5', type: 'location', text: `${query} City`, subtitle: 'Location' },
  ];
};

const TRENDING_HASHTAGS: TrendingHashtag[] = [
  { tag: 'SummerVibes', postCount: 4500000, thumbnailUrl: 'https://picsum.photos/seed/trend1/100/100' },
  { tag: 'Photography', postCount: 12000000, thumbnailUrl: 'https://picsum.photos/seed/trend2/100/100' },
  { tag: 'FoodPorn', postCount: 8700000, thumbnailUrl: 'https://picsum.photos/seed/trend3/100/100' },
  { tag: 'OOTD', postCount: 5200000, thumbnailUrl: 'https://picsum.photos/seed/trend4/100/100' },
  { tag: 'Wanderlust', postCount: 6300000, thumbnailUrl: 'https://picsum.photos/seed/trend5/100/100' },
  { tag: 'FitnessGoals', postCount: 3900000, thumbnailUrl: 'https://picsum.photos/seed/trend6/100/100' },
];

const SHOPPING_PRODUCTS: ShoppingProduct[] = [
  { id: 'p1', name: 'Designer Sunglasses', price: '$129.99', thumbnailUrl: 'https://picsum.photos/seed/shop1/200/200', brand: 'LuxView' },
  { id: 'p2', name: 'Running Shoes Pro', price: '$189.00', thumbnailUrl: 'https://picsum.photos/seed/shop2/200/200', brand: 'SpeedRun' },
  { id: 'p3', name: 'Leather Crossbody Bag', price: '$249.00', thumbnailUrl: 'https://picsum.photos/seed/shop3/200/200', brand: 'CraftCo' },
  { id: 'p4', name: 'Wireless Earbuds', price: '$79.99', thumbnailUrl: 'https://picsum.photos/seed/shop4/200/200', brand: 'SoundWave' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ExplorePage: React.FC = () => {
  const [posts, setPosts] = useState<ExplorePost[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeCategory, setActiveCategory] = useState<ExploreCategory>('All');
  const [recentSearches, setRecentSearches] = useState<string[]>(['sunset photography', 'travel japan', 'street food', 'minimalist design']);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearchPanel, setShowSearchPanel] = useState<boolean>(false);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load posts
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 600));
        setPosts(generateExplorePosts(activeCategory));
      } catch (err) {
        setError('Failed to load explore content.');
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
  }, [activeCategory]);

  // Search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      setSuggestions(generateSuggestions(searchQuery));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    setRecentSearches(prev => [query, ...prev.filter(s => s !== query)].slice(0, 10));
    setShowSearchPanel(false);
    setSearchQuery(query);
  }, []);

  const handleClearRecent = useCallback((search: string) => {
    setRecentSearches(prev => prev.filter(s => s !== search));
  }, []);

  const handleCategoryChange = useCallback((category: ExploreCategory) => {
    setActiveCategory(category);
  }, []);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  };

  // Loading state
  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Discovering content...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <p className="text-white text-center">{error}</p>
          <button
            onClick={() => { setError(null); setPosts(generateExplorePosts(activeCategory)); }}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Search Bar */}
      <div className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm px-4 py-3 border-b border-gray-800">
        <div className="relative max-w-lg mx-auto">
          <div className="relative flex items-center">
            <svg className="absolute left-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearchPanel(true)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 rounded-xl text-sm text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                className="absolute right-3 text-gray-400 hover:text-white"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.3 5.71a1 1 0 00-1.42 0L12 10.59 7.12 5.71a1 1 0 00-1.42 1.42L10.59 12l-4.88 4.88a1 1 0 001.42 1.42L12 13.41l4.88 4.88a1 1 0 001.42-1.42L13.41 12l4.88-4.88a1 1 0 000-1.41z" />
                </svg>
              </button>
            )}
          </div>

          {/* Search panel */}
          {showSearchPanel && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 rounded-xl border border-gray-700 shadow-xl max-h-[60vh] overflow-y-auto z-50">
              {suggestions.length > 0 ? (
                <div className="py-2">
                  {suggestions.map(suggestion => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSearch(suggestion.text)}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-gray-800 transition-colors"
                    >
                      {suggestion.avatarUrl ? (
                        <img src={suggestion.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                          {suggestion.type === 'hashtag' ? '#' : suggestion.type === 'location' ? '📍' : '@'}
                        </div>
                      )}
                      <div className="text-left">
                        <p className="text-sm font-medium">{suggestion.text}</p>
                        <p className="text-xs text-gray-400">{suggestion.subtitle}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-3">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm font-semibold">Recent</span>
                    <button className="text-sm text-blue-500 hover:text-blue-400">Clear all</button>
                  </div>
                  {recentSearches.map((search, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-800">
                      <button onClick={() => handleSearch(search)} className="flex items-center gap-3">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm">{search}</span>
                      </button>
                      <button onClick={() => handleClearRecent(search)} className="text-gray-500 hover:text-white">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.3 5.71a1 1 0 00-1.42 0L12 10.59 7.12 5.71a1 1 0 00-1.42 1.42L10.59 12l-4.88 4.88a1 1 0 001.42 1.42L12 13.41l4.88 4.88a1 1 0 001.42-1.42L13.41 12l4.88-4.88a1 1 0 000-1.41z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-gray-800 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-lg mx-auto">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => handleCategoryChange(category)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === category
                  ? 'bg-white text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-1">
        {/* Trending Hashtags */}
        <div className="px-3 py-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Trending</h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {TRENDING_HASHTAGS.map(hashtag => (
              <div key={hashtag.tag} className="flex-shrink-0 flex items-center gap-2 bg-gray-800/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-700/50 transition-colors">
                <img src={hashtag.thumbnailUrl} alt="" className="w-8 h-8 rounded object-cover" />
                <div>
                  <p className="text-xs font-semibold">#{hashtag.tag}</p>
                  <p className="text-[10px] text-gray-400">{formatCount(hashtag.postCount)} posts</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mixed-size Grid */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-400">No posts found for this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post, i) => {
              const isLarge = i % 10 === 0 || i % 10 === 6;
              return (
                <div
                  key={post.id}
                  className={`relative aspect-square bg-gray-900 cursor-pointer overflow-hidden ${isLarge ? 'col-span-2 row-span-2' : ''}`}
                  onMouseEnter={() => setHoveredPost(post.id)}
                  onMouseLeave={() => setHoveredPost(null)}
                >
                  <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />

                  {/* Type indicators */}
                  {post.type === 'reel' && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  {post.type === 'igtv' && (
                    <div className="absolute top-2 right-2 bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      IGTV
                    </div>
                  )}
                  {post.isMultiple && (
                    <div className="absolute top-2 right-2">
                      <svg className="w-5 h-5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                      </svg>
                    </div>
                  )}
                  {post.duration && (
                    <div className="absolute bottom-2 right-2 text-white text-xs font-medium drop-shadow">
                      {post.duration}
                    </div>
                  )}

                  {/* Hover overlay */}
                  {hoveredPost === post.id && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-6 transition-opacity">
                      <div className="flex items-center gap-1 text-white font-semibold">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        <span className="text-sm">{formatCount(post.likeCount)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-white font-semibold">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                        </svg>
                        <span className="text-sm">{formatCount(post.commentCount)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Shopping Section */}
        <div className="px-3 py-6 border-t border-gray-800 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Shop</h3>
            <button className="text-sm text-blue-500 hover:text-blue-400">See all</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SHOPPING_PRODUCTS.map(product => (
              <div key={product.id} className="bg-gray-900 rounded-xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-purple-500 transition-all">
                <img src={product.thumbnailUrl} alt={product.name} className="w-full aspect-square object-cover" />
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-gray-400">{product.brand}</p>
                  <p className="text-sm font-semibold text-purple-400 mt-1">{product.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* IGTV Section */}
        <div className="px-3 py-6 border-t border-gray-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">IGTV</h3>
            <button className="text-sm text-blue-500 hover:text-blue-400">See all</button>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {posts.filter(p => p.type === 'igtv').slice(0, 6).map(post => (
              <div key={post.id} className="flex-shrink-0 w-32">
                <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-gray-800">
                  <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  {post.duration && (
                    <div className="absolute bottom-1 left-1 text-white text-[10px] font-medium bg-black/60 px-1 rounded">
                      {post.duration}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-300 mt-1 truncate">{post.username}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
