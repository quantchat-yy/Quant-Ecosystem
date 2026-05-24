// ============================================================================
// QuantNeon - User Profile Page
// Avatar, stats, highlights, tabs (posts/reels/tagged), follow/message
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProfileData {
  id: string;
  username: string;
  fullName: string;
  bio: string;
  bioLinks: { label: string; url: string }[];
  avatarUrl: string;
  isVerified: boolean;
  isPrivate: boolean;
  postCount: number;
  followerCount: number;
  followingCount: number;
  mutualFollowers: string[];
  category: string;
  pronouns: string;
  externalUrl: string;
}

interface Highlight {
  id: string;
  title: string;
  coverUrl: string;
  storyCount: number;
}

interface ProfilePost {
  id: string;
  thumbnailUrl: string;
  type: 'image' | 'video' | 'reel' | 'carousel';
  likeCount: number;
  commentCount: number;
  isPinned: boolean;
}

type ProfileTab = 'posts' | 'reels' | 'tagged';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const generateProfile = (id: string): ProfileData => ({
  id,
  username: 'alex_creative',
  fullName: 'Alex Creative Studio',
  bio: 'Digital artist & photographer\nCreating visual stories since 2018\nAvailable for collabs',
  bioLinks: [
    { label: 'Portfolio', url: 'https://alexcreative.com' },
    { label: 'Shop', url: 'https://shop.alexcreative.com' },
  ],
  avatarUrl: `https://picsum.photos/seed/profile${id}/200/200`,
  isVerified: true,
  isPrivate: false,
  postCount: 847,
  followerCount: 125600,
  followingCount: 892,
  mutualFollowers: ['design_daily', 'photo_master', 'color_theory'],
  category: 'Artist',
  pronouns: 'they/them',
  externalUrl: 'alexcreative.com',
});

const generateHighlights = (): Highlight[] => [
  { id: 'h1', title: 'Travel', coverUrl: 'https://picsum.photos/seed/hl1/100/100', storyCount: 24 },
  { id: 'h2', title: 'Art', coverUrl: 'https://picsum.photos/seed/hl2/100/100', storyCount: 18 },
  { id: 'h3', title: 'BTS', coverUrl: 'https://picsum.photos/seed/hl3/100/100', storyCount: 12 },
  { id: 'h4', title: 'Collabs', coverUrl: 'https://picsum.photos/seed/hl4/100/100', storyCount: 8 },
  { id: 'h5', title: 'Tips', coverUrl: 'https://picsum.photos/seed/hl5/100/100', storyCount: 15 },
  { id: 'h6', title: 'Events', coverUrl: 'https://picsum.photos/seed/hl6/100/100', storyCount: 6 },
];

const generatePosts = (tab: ProfileTab): ProfilePost[] => {
  const count = tab === 'posts' ? 30 : tab === 'reels' ? 18 : 12;
  return Array.from({ length: count }, (_, i) => ({
    id: `${tab}-${i}`,
    thumbnailUrl: `https://picsum.photos/seed/${tab}${i}/300/300`,
    type: tab === 'reels' ? 'reel' : (['image', 'carousel', 'video'] as const)[i % 3],
    likeCount: Math.floor(Math.random() * 20000) + 500,
    commentCount: Math.floor(Math.random() * 500) + 10,
    isPinned: tab === 'posts' && i < 3,
  }));
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPost, setHoveredPost] = useState<string | null>(null);
  const [showBioExpanded, setShowBioExpanded] = useState<boolean>(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Load profile
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise(resolve => setTimeout(resolve, 500));
        const id = typeof window !== 'undefined' ? window.location.pathname.split('/').pop() || '1' : '1';
        setProfile(generateProfile(id));
        setHighlights(generateHighlights());
        setPosts(generatePosts('posts'));
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load posts when tab changes
  useEffect(() => {
    setPosts(generatePosts(activeTab));
  }, [activeTab]);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleFollow = useCallback(() => {
    setIsFollowing(prev => !prev);
  }, []);

  const handleTabChange = useCallback((tab: ProfileTab) => {
    setActiveTab(tab);
  }, []);

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return String(count);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <p className="text-white text-center">{error || 'Profile not found'}</p>
          <button
            onClick={() => window.location.reload()}
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
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {profile.isPrivate && (
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z" />
            </svg>
          )}
          <h1 className="text-lg font-bold flex items-center gap-1">
            {profile.username}
            {profile.isVerified && (
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            )}
          </h1>
        </div>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-800 rounded-full">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 rounded-xl border border-gray-700 shadow-xl overflow-hidden z-50">
              <button className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Settings
              </button>
              <button className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Activity
              </button>
              <button className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                Saved
              </button>
              <button className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 flex items-center gap-3 border-t border-gray-800">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span className="text-red-400">Block</span>
              </button>
              <button className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <span className="text-red-400">Report</span>
              </button>
              <button className="w-full px-4 py-3 text-left text-sm hover:bg-gray-800 flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                Share Profile
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Profile Info */}
      <div className="px-4 py-4">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px] flex-shrink-0">
            <div className="w-full h-full rounded-full border-2 border-black overflow-hidden">
              <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1">
            <div className="flex justify-around text-center">
              <div>
                <p className="text-lg font-bold">{formatCount(profile.postCount)}</p>
                <p className="text-xs text-gray-400">Posts</p>
              </div>
              <div className="cursor-pointer">
                <p className="text-lg font-bold">{formatCount(profile.followerCount)}</p>
                <p className="text-xs text-gray-400">Followers</p>
              </div>
              <div className="cursor-pointer">
                <p className="text-lg font-bold">{formatCount(profile.followingCount)}</p>
                <p className="text-xs text-gray-400">Following</p>
              </div>
            </div>
          </div>
        </div>

        {/* Name, Bio, Links */}
        <div className="mt-4">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm">{profile.fullName}</h2>
            {profile.pronouns && <span className="text-xs text-gray-400">{profile.pronouns}</span>}
          </div>
          {profile.category && <p className="text-xs text-gray-400 mt-0.5">{profile.category}</p>}
          <p className="text-sm mt-1 whitespace-pre-line">{profile.bio}</p>
          {profile.bioLinks.map((link, i) => (
            <a key={i} href={link.url} className="text-sm text-blue-400 hover:underline block mt-0.5">
              {link.label}
            </a>
          ))}
          {profile.mutualFollowers.length > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Followed by <span className="text-white">{profile.mutualFollowers.slice(0, 2).join(', ')}</span>
              {profile.mutualFollowers.length > 2 && ` + ${profile.mutualFollowers.length - 2} more`}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleFollow}
            className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              isFollowing
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
          <button className="flex-1 py-1.5 bg-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors">
            Message
          </button>
          <button className="px-3 py-1.5 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 12c0 1.654-1.346 3-3 3s-3-1.346-3-3 1.346-3 3-3 3 1.346 3 3zm9-.449s-4.252 8.449-11.985 8.449c-7.18 0-12.015-8.449-12.015-8.449s4.446-7.551 12.015-7.551c7.694 0 11.985 7.551 11.985 7.551z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Highlights */}
      <div className="border-b border-gray-800 py-3">
        <div className="flex gap-4 overflow-x-auto px-4 scrollbar-hide">
          {highlights.map(highlight => (
            <div key={highlight.id} className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer">
              <div className="w-16 h-16 rounded-full border border-gray-600 p-[2px]">
                <img src={highlight.coverUrl} alt={highlight.title} className="w-full h-full rounded-full object-cover" />
              </div>
              <span className="text-xs text-gray-300 max-w-[64px] truncate">{highlight.title}</span>
            </div>
          ))}
          {/* Add new highlight */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer">
            <div className="w-16 h-16 rounded-full border border-dashed border-gray-600 flex items-center justify-center">
              <span className="text-2xl text-gray-500">+</span>
            </div>
            <span className="text-xs text-gray-400">New</span>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-800 sticky top-12 bg-black z-30">
        <button
          onClick={() => handleTabChange('posts')}
          className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
            activeTab === 'posts' ? 'border-white' : 'border-transparent text-gray-500'
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" />
          </svg>
        </button>
        <button
          onClick={() => handleTabChange('reels')}
          className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
            activeTab === 'reels' ? 'border-white' : 'border-transparent text-gray-500'
          }`}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <button
          onClick={() => handleTabChange('tagged')}
          className={`flex-1 py-3 flex justify-center border-b-2 transition-colors ${
            activeTab === 'tagged' ? 'border-white' : 'border-transparent text-gray-500'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </div>

      {/* Post Grid */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full border-2 border-gray-600 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
          <h3 className="text-white font-semibold">No {activeTab} yet</h3>
          <p className="text-gray-400 text-sm mt-1">When you share content, it will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.map(post => (
            <div
              key={post.id}
              className="relative aspect-square bg-gray-900 cursor-pointer overflow-hidden"
              onMouseEnter={() => setHoveredPost(post.id)}
              onMouseLeave={() => setHoveredPost(null)}
            >
              <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />

              {/* Type indicators */}
              {post.type === 'reel' && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}
              {post.type === 'carousel' && (
                <div className="absolute top-2 right-2">
                  <svg className="w-4 h-4 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                  </svg>
                </div>
              )}
              {post.isPinned && (
                <div className="absolute top-2 left-2">
                  <svg className="w-3.5 h-3.5 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                  </svg>
                </div>
              )}

              {/* Hover overlay */}
              {hoveredPost === post.id && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 transition-opacity">
                  <div className="flex items-center gap-1 text-white font-semibold text-sm">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    {formatCount(post.likeCount)}
                  </div>
                  <div className="flex items-center gap-1 text-white font-semibold text-sm">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                    </svg>
                    {formatCount(post.commentCount)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
