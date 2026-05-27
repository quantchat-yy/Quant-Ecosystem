// ============================================================================
// QuantMax - Dating Swipe Cards (Tinder-style)
// ============================================================================

import React, { useState, useCallback } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useMatching } from '../hooks/useMatching';

const MatchingPage: React.FC = () => {
  const matching = useMatching();
  const [showMatch, setShowMatch] = useState<boolean>(false);

  const currentProfile = matching.currentProfile;

  const handleLike = useCallback(() => {
    const result = matching.swipe('like');
    if (result && result.isMatch) setShowMatch(true);
  }, [matching]);

  const handlePass = useCallback(() => {
    matching.swipe('pass');
  }, [matching]);

  const handleSuperLike = useCallback(() => {
    const result = matching.swipe('superlike');
    if (result && result.isMatch) setShowMatch(true);
  }, [matching]);

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
            {currentProfile.photos && currentProfile.photos.length > 0 && (
              <img
                className="profile-photo"
                src={currentProfile.photos[0]}
                alt={currentProfile.displayName}
              />
            )}
            {currentProfile.verified && <span className="verified-badge">✓</span>}
          </div>
          <div className="card-info">
            <h2 className="profile-name">
              {currentProfile.displayName}, {currentProfile.age}
            </h2>
            {currentProfile.distance && (
              <span className="profile-distance">{currentProfile.distance} km away</span>
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

      {showMatch && (
        <div className="match-celebration-overlay" onClick={() => setShowMatch(false)}>
          <div className="match-celebration">
            <h1>It is a Match!</h1>
            <p>You and {currentProfile.displayName} liked each other</p>
            <button className="send-message-btn" onClick={() => setShowMatch(false)}>
              Send a Message
            </button>
            <button className="keep-swiping-btn" onClick={() => setShowMatch(false)}>
              Keep Swiping
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingPage;
