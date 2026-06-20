// ============================================================================
// QuantNeon - User Profile Page
// Avatar with story ring, verified badge, bio, stats, follow/message, tabs, grid
// ============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LoadingState, ErrorState, EmptyState, PageTransition } from '@quant/shared-ui';
import { useProfile } from '../../hooks/useProfile';
import { useUserPosts } from '../../hooks/useUserPosts';
import { apiClient } from '../../services/api-client';

type ProfileTab = 'posts' | 'reels' | 'tagged';

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const id = (router.query.id as string) || '';
  const queryClient = useQueryClient();

  // All hooks are declared unconditionally, before any early return, to keep
  // hook ordering stable across renders.
  const { data: profile, isLoading, error, refetch } = useProfile(id);
  const { data: userPosts = [] } = useUserPosts(id);
  const [activeTab, setActiveTab] = useState<ProfileTab>('posts');
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (profile) {
      setIsFollowing(profile.isFollowing || false);
    }
  }, [profile]);

  const followMutation = useMutation({
    mutationFn: async (follow: boolean) => {
      const response = follow ? await apiClient.follow(id) : await apiClient.unfollow(id);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to update follow state');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neon-profile', id] });
    },
  });

  const handleToggleFollow = useCallback(() => {
    const next = !isFollowing;
    setIsFollowing(next);
    followMutation.mutate(next);
  }, [isFollowing, followMutation]);

  const messageMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.startConversation(id);
      if (!response.success || !response.data) {
        throw new Error(response.error?.message || 'Failed to open conversation');
      }
      return response.data.conversationId;
    },
    onSuccess: () => {
      void router.push('/messages');
    },
  });

  const formatCount = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 10000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
  };

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

  const p = profile;

  return (
    <PageTransition>
      <div className="min-h-screen bg-white dark:bg-[#0F0F14] text-gray-900 dark:text-gray-100">
        <div className="max-w-2xl mx-auto">
          {/* Profile Header */}
          <div className="px-4 py-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="p-[3px] rounded-full bg-transparent">
                  <img
                    className="w-20 h-20 rounded-full object-cover border-[3px] border-white dark:border-[#0F0F14]"
                    src={p.avatarUrl}
                    alt={p.username}
                  />
                </div>
              </div>

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

            <div className="flex gap-2 mt-4">
              <motion.button
                whileTap={{ scale: 0.95 }}
                className={`flex-1 min-h-[44px] py-2 rounded-lg font-medium text-sm transition-colors ${
                  isFollowing
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
                    : 'bg-purple-600 text-white'
                }`}
                onClick={handleToggleFollow}
                disabled={followMutation.isPending}
                aria-label={isFollowing ? 'Unfollow' : 'Follow'}
                aria-pressed={isFollowing}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </motion.button>
              <button
                className="flex-1 min-h-[44px] py-2 rounded-lg font-medium text-sm bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-60"
                aria-label="Send message"
                onClick={() => messageMutation.mutate()}
                disabled={messageMutation.isPending}
              >
                {messageMutation.isPending ? 'Opening…' : 'Message'}
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
              {activeTab === 'posts' && userPosts.length === 0 && (
                <div className="col-span-3 py-12">
                  <EmptyState title="No posts yet" description="Posts will appear here" />
                </div>
              )}
              {activeTab === 'posts' &&
                userPosts.map((post) => (
                  <button
                    key={post.id}
                    className="relative aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden"
                    onClick={() => router.push(`/post/${post.id}`)}
                    aria-label="Open post"
                  >
                    {post.mediaUrls && post.mediaUrls[0] ? (
                      <img
                        src={post.mediaUrls[0]}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                        &#128247;
                      </div>
                    )}
                  </button>
                ))}
              {activeTab !== 'posts' && (
                <div className="col-span-3 py-12">
                  <EmptyState
                    title={activeTab === 'reels' ? 'No reels yet' : 'No tagged posts'}
                    description="Content will appear here"
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProfilePage;
