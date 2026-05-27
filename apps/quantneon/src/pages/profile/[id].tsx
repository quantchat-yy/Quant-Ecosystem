// ============================================================================
// QuantNeon - User Profile Page
// ============================================================================

import React from 'react';
import { useRouter } from 'next/router';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useProfile } from '../../hooks/useProfile';

const ProfilePage: React.FC = () => {
  const router = useRouter();
  const id = (router.query.id as string) || '';
  const { data: profile, isLoading, error, refetch } = useProfile(id);

  if (isLoading) return <LoadingState variant="skeleton" text="Loading profile..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (!profile)
    return <EmptyState title="Profile not found" description="This user may not exist" />;

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
    <div className="profile-page">
      <div className="profile-header">
        <img className="profile-avatar" src={p.avatar} alt={p.username} />
        <div className="profile-info">
          <h1 className="profile-username">{p.username}</h1>
          {p.displayName && <span className="display-name">{p.displayName}</span>}
          {p.bio && <p className="profile-bio">{p.bio}</p>}
        </div>
      </div>
      <div className="profile-stats">
        <div className="stat">
          <span className="stat-value">{(p.posts || 0).toLocaleString()}</span>
          <span className="stat-label">Posts</span>
        </div>
        <div className="stat">
          <span className="stat-value">{(p.followers || 0).toLocaleString()}</span>
          <span className="stat-label">Followers</span>
        </div>
        <div className="stat">
          <span className="stat-value">{(p.following || 0).toLocaleString()}</span>
          <span className="stat-label">Following</span>
        </div>
      </div>
      <div className="profile-actions">
        <button className={`follow-btn ${p.isFollowing ? 'following' : ''}`}>
          {p.isFollowing ? 'Following' : 'Follow'}
        </button>
        <button className="message-btn">Message</button>
      </div>
      <div className="profile-grid">
        {(p.postGrid || []).map((post) => (
          <div key={post.id} className="grid-item">
            <img src={post.thumbnailUrl} alt="" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;
