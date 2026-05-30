// ============================================================================
// QuantNeon - User Profile Page
// ============================================================================

import React from 'react';
import { useRouter } from 'next/router';
import { LoadingState, ErrorState, EmptyState, PageTransition } from '@quant/shared-ui';
import { useProfile } from '../../hooks/useProfile';

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const id = (router.query.id as string) || '';
  const { data: profile, isLoading, error, refetch } = useProfile(id);

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

  const p = profile as {
    id: string;
    username?: string;
    displayName?: string;
    avatar?: string;
    bio?: string;
    posts?: number;
    followers?: number;
    following?: number;
    isFollowing?: boolean;
    postGrid?: { id: string; thumbnailUrl: string }[];
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-white dark:bg-[#0F0F14] text-gray-900 dark:text-gray-100">
        <div className="px-4 max-w-2xl mx-auto py-6">
          {/* Header */}
          <div className="flex items-center gap-6 mb-6">
            <img
              className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
              src={p.avatar}
              alt={p.username}
            />
            <div className="flex-1">
              <h1 className="text-xl font-bold">{p.username}</h1>
              {p.displayName && (
                <span className="text-sm text-gray-600 dark:text-gray-400">{p.displayName}</span>
              )}
              {p.bio && <p className="text-sm mt-1">{p.bio}</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-around py-4 border-y border-gray-200 dark:border-gray-800 mb-4">
            <div className="text-center">
              <span className="font-bold block">{(p.posts || 0).toLocaleString()}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Posts</span>
            </div>
            <div className="text-center">
              <span className="font-bold block">{(p.followers || 0).toLocaleString()}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Followers</span>
            </div>
            <div className="text-center">
              <span className="font-bold block">{(p.following || 0).toLocaleString()}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">Following</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mb-6">
            <button
              className={`flex-1 min-h-[44px] py-2 rounded-lg font-medium text-sm ${p.isFollowing ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white' : 'bg-purple-600 text-white'}`}
            >
              {p.isFollowing ? 'Following' : 'Follow'}
            </button>
            <button className="flex-1 min-h-[44px] py-2 rounded-lg font-medium text-sm bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white">
              Message
            </button>
          </div>

          {/* Post Grid */}
          <div className="grid grid-cols-3 gap-0.5">
            {(p.postGrid || []).map((post) => (
              <div
                key={post.id}
                className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden"
              >
                <img src={post.thumbnailUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProfilePage;
