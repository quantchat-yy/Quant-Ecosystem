// ============================================================================
// QuantNeon - User Profile Page
// Avatar with story ring, verified badge, bio, stats, follow/message, tabs, grid
// ============================================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { LoadingState, ErrorState, EmptyState, PageTransition } from '@quant/shared-ui';
import { useProfile } from '../../hooks/useProfile';
import type { Profile } from '../../types';

type ProfileTab = 'posts' | 'reels' | 'tagged';

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const id = (router.query.id as string) || '';
  const { data: profile, isLoading, error, refetch } = useProfile(id);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isFollowing, setIsFollowing] = useState(false);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center">
          <LoadingState variant="skeleton" text="Loading profile..." />
        </div>
      </PageTransition>
    );
  }
  if (error) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center">
          <ErrorState message={error.message} onRetry={() => void refetch()} />
        </div>
      </PageTransition>
    );
  }
  if (!profile) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center">
          <EmptyState title="Profile not found" description="This user may not exist" />
        </div>
      </PageTransition>
    );
  }

  const p = profile as Profile | undefined;

  React.useEffect(() => {
    if (p) {
      setIsFollowing(p.isFollowing || false);
    }
  }, [profile]);

  if (!p) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center">
          <EmptyState title="Profile not found" description="This user may not exist" />
        </div>
      </PageTransition>
    );
  }

  const formatCount = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 10000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-white dark:bg-[#0F0F14] text-gray-900 dark:text-gray-100">
        <div className="max-w-2xl mx-auto">
          {/* Profile Header */}
          <div className="px-4 py-6">
            <div className="flex items-center gap-6">
              {/* Avatar with Story Ring */}
              <div className="relative">
                <div className="p-[3px] rounded-full bg-transparent">
                  <img
                    className="w-20 h-20 rounded-full object-cover border-[3px] border-white dark:border-[#0F0F14]"
                    src={p.avatarUrl}
                    alt={p.username}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <h1 className="text-lg font-semibold">{p.username}</h1>
                  {p.isVerified && (
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[8px] text-white"
                      aria-label="Verified account"
                    >
                      &#10003;
                    </span>
                  )}
                </div>
                <div className="flex gap-6" aria-label="Profile statistics">
                  <div className="text-center">
                    <span className="font-bold block">{formatCount(p.postCount)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Posts</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold block">{formatCount(p.followerCount)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Followers</span>
                  </div>
                  <div className="text-center">
                    <span className="font-bold block">{formatCount(p.followingCount)}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Following</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Display Name + Bio */}
            <div className="mt-4">
              {p.displayName && (
                <span className="font-semibold text-sm block">{p.displayName}</span>
              )}
              {p.bio && <p className="text-sm mt-1 whitespace-pre-line leading-relaxed">{p.bio}</p>}
              {p.website && (
                <a
                  href={p.website}
                  className="text-sm text-purple-500 font-medium mt-1 block hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {p.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className={`flex-1 min-h-[44px] py-2 rounded-lg font-medium text-sm transition-colors ${
                  isFollowing
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'bg-purple-600 text-white'
                }`}
                onClick={() => setIsFollowing(!isFollowing)}
                aria-label={isFollowing ? 'Unfollow' : 'Follow'}
                aria-pressed={isFollowing}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </motion.button>
              <button
                className="flex-1 min-h-[44px] py-2 rounded-lg font-medium text-sm bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                aria-label="Send message"
              >
                Message
              </button>
              <button
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
                aria-label="More options"
              >
                &#9660;
              </button>
            </div>
          </div>

          {/* Tab Bar */}
          <div
            className="border-t border-gray-200 dark:border-gray-800"
            role="tablist"
            aria-label="Profile content"
          >
            <div className="flex">
              <button
                className={`flex-1 py-3 flex justify-center items-center gap-1 text-sm ${
                  activeTab === 'posts'
                    ? 'border-t-2 border-gray-900 dark:border-white font-semibold'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('posts')}
                role="tab"
                aria-selected={activeTab === 'posts'}
                aria-label="Posts grid"
              >
                <span>&#9638;</span>
              </button>
              <button
                className={`flex-1 py-3 flex justify-center items-center gap-1 text-sm ${
                  activeTab === 'reels'
                    ? 'border-t-2 border-gray-900 dark:border-white font-semibold'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('reels')}
                role="tab"
                aria-selected={activeTab === 'reels'}
                aria-label="Reels"
              >
                <span>&#9654;</span>
              </button>
              <button
                className={`flex-1 py-3 flex justify-center items-center gap-1 text-sm ${
                  activeTab === 'tagged'
                    ? 'border-t-2 border-gray-900 dark:border-white font-semibold'
                    : 'text-gray-500'
                }`}
                onClick={() => setActiveTab('tagged')}
                role="tab"
                aria-selected={activeTab === 'tagged'}
                aria-label="Tagged posts"
              >
                <span>&#128100;</span>
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-3 gap-0.5"
              role="tabpanel"
              aria-label={`${activeTab} content`}
            >
              {/* Placeholder grid items - populated by API in production */}
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={`${activeTab}-${i}`}
                  className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden"
                >
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    {activeTab === 'reels' && <span className="text-lg">&#9654;</span>}
                    {activeTab === 'tagged' && <span className="text-lg">&#128100;</span>}
                    {activeTab === 'posts' && <span className="text-lg">&#128247;</span>}
                  </div>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProfilePage;
