// ============================================================================
// QuantMax - Dating Swipe Cards (Tinder-style)
// ============================================================================

import React, { useCallback } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useMatching } from '../hooks/useMatching';

const MatchingPage: React.FC = () => {
  const matching = useMatching();

  const currentProfile = matching.currentProfile;

  const handleLike = useCallback(() => {
    if (currentProfile) {
      matching.like(currentProfile.id);
    }
  }, [matching, currentProfile]);

  const handlePass = useCallback(() => {
    if (currentProfile) {
      matching.pass(currentProfile.id);
    }
  }, [matching, currentProfile]);

  const handleSuperLike = useCallback(() => {
    if (currentProfile) {
      matching.superLike(currentProfile.id);
    }
  }, [matching, currentProfile]);

  if (matching.isLoading && !currentProfile) {
    return <LoadingState variant="skeleton" text="Finding people near you..." />;
  }

  if (matching.error) {
    return <ErrorState message={matching.error} onRetry={() => window.location.reload()} />;
  }

  if (!currentProfile) {
    return (
      <EmptyState
        title="No more profiles"
        description="Check back later for new people in your area"
      />
    );
  }

  return (
    <div className="matching-page">
      <div className="card-stack">
        <div className="profile-card">
          <div className="card-photos">
            {currentProfile.photos &&
              currentProfile.photos.length > 0 &&
              currentProfile.photos[0] && (
                <img
                  className="profile-photo"
                  src={currentProfile.photos[0].url}
                  alt={currentProfile.displayName}
                />
              )}
            {currentProfile.verified === 'verified' && <span className="verified-badge">✓</span>}
          </div>
          <div className="card-info">
            <h2 className="profile-name">
              {currentProfile.displayName}, {currentProfile.age}
            </h2>
            {currentProfile.location && (
              <span className="profile-distance">{currentProfile.location.city}</span>
            )}
            {currentProfile.bio && <p className="profile-bio">{currentProfile.bio}</p>}
            {currentProfile.interests && currentProfile.interests.length > 0 && (
              <div className="profile-interests">
                {currentProfile.interests.map((interest: string) => (
                  <span key={interest} className="interest-tag">
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="swipe-actions">
        <button className="action-btn pass" onClick={handlePass}>
          <span>✕</span>
        </button>
        <button className="action-btn superlike" onClick={handleSuperLike}>
          <span>⭐</span>
        </button>
        <button className="action-btn like" onClick={handleLike}>
          <span>♥</span>
        </button>
      </div>

      {matching.canUndo && (
        <button className="undo-btn" onClick={() => matching.undo()}>
          Undo
        </button>
      )}

      {matching.matchCelebration && (
        <div className="match-celebration-overlay" onClick={() => matching.dismissCelebration()}>
          <div className="match-celebration">
            <h1>It is a Match!</h1>
            <p>You and {matching.matchCelebration.profileName} liked each other</p>
            <button className="send-message-btn" onClick={() => matching.dismissCelebration()}>
              Send a Message
            </button>
            <button className="keep-swiping-btn" onClick={() => matching.dismissCelebration()}>
              Keep Swiping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingPage;
