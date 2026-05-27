// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantMax - Dating Swipe Cards (Tinder-style)
// Card stack with photo + name + age + distance + bio, like/pass/super-like
// buttons, undo, boost, photo verification badge, common interests, animations
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface ProfilePhoto {
  id: string;
  url: string;
  isVerified: boolean;
}

interface ProfilePrompt {
  question: string;
  answer: string;
}

interface DatingProfile {
  id: string;
  displayName: string;
  age: number;
  distance: number;
  bio: string;
  photos: ProfilePhoto[];
  interests: string[];
  job: string;
  company: string;
  education: string;
  city: string;
  isVerified: boolean;
  prompts: ProfilePrompt[];
  height: string;
  lookingFor: string;
}

interface SwipeHistory {
  profileId: string;
  action: 'like' | 'pass' | 'superlike';
  timestamp: number;
}

type SwipeDirection = 'left' | 'right' | 'up' | null;

const MatchingPage: React.FC = () => {
  const [profiles, setProfiles] = useState<DatingProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistory[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(0);
  const [showFullProfile, setShowFullProfile] = useState<boolean>(false);
  const [showMatchModal, setShowMatchModal] = useState<boolean>(false);
  const [matchedProfile, setMatchedProfile] = useState<DatingProfile | null>(null);
  const [boostActive, setBoostActive] = useState<boolean>(false);
  const [boostTimeLeft, setBoostTimeLeft] = useState<number>(0);
  const [dailyLikesLeft, setDailyLikesLeft] = useState<number>(30);
  const [dailySuperLikesLeft, setDailySuperLikesLeft] = useState<number>(3);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const dragOffsetX = useRef<number>(0);
  const boostInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentProfile = useMemo(() => profiles[currentIndex] || null, [profiles, currentIndex]);

  useEffect(() => {
    loadProfiles();
    return () => {
      if (boostInterval.current) clearInterval(boostInterval.current);
    };
  }, []);

  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [currentIndex]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const mockProfiles: DatingProfile[] = Array.from({ length: 25 }, (_, i) => ({
        id: `profile-${i}`,
        displayName: [
          'Alex',
          'Jordan',
          'Sam',
          'Morgan',
          'Taylor',
          'Casey',
          'Riley',
          'Avery',
          'Quinn',
          'Reese',
        ][i % 10],
        age: 22 + Math.floor(Math.random() * 12),
        distance: Math.floor(Math.random() * 50) + 1,
        bio: `Love exploring new places and meeting interesting people. ${i % 2 === 0 ? 'Coffee addict and book lover.' : 'Adventure seeker and sunset chaser.'}`,
        photos: Array.from({ length: 3 + Math.floor(Math.random() * 4) }, (_, j) => ({
          id: `photo-${i}-${j}`,
          url: `https://cdn.quantmax.app/dating/photos/${i}/${j}.jpg`,
          isVerified: j === 0 && i % 3 === 0,
        })),
        interests: [
          'Travel',
          'Music',
          'Hiking',
          'Photography',
          'Cooking',
          'Yoga',
          'Reading',
          'Coffee',
          'Art',
          'Dancing',
        ]
          .sort(() => Math.random() - 0.5)
          .slice(0, 4 + Math.floor(Math.random() * 4)),
        job: [
          'Designer',
          'Engineer',
          'Teacher',
          'Doctor',
          'Writer',
          'Photographer',
          'Chef',
          'Musician',
        ][i % 8],
        company: ['Google', 'Spotify', 'Netflix', 'Apple', 'Freelance', 'Self-employed'][i % 6],
        education: ['Stanford', 'MIT', 'NYU', 'UCLA', 'Columbia', 'UC Berkeley'][i % 6],
        city: ['New York', 'San Francisco', 'London', 'Tokyo', 'Paris', 'Berlin'][i % 6],
        isVerified: i % 3 === 0,
        prompts: [
          {
            question: 'My ideal weekend looks like',
            answer: 'Brunch, hiking, and a good movie night',
          },
          {
            question: 'A fact about me that surprises people',
            answer: 'I can speak three languages fluently',
          },
        ],
        height: `${5 + Math.floor(Math.random() * 2)}'${Math.floor(Math.random() * 12)}"`,
        lookingFor: ['Relationship', 'Something casual', 'Friends', 'Not sure yet'][i % 4],
      }));
      setProfiles(mockProfiles);
    } catch (err) {
      setError('Could not load profiles. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSwipe = useCallback(
    (action: 'like' | 'pass' | 'superlike') => {
      if (!currentProfile) return;

      if (action === 'like' && dailyLikesLeft <= 0) return;
      if (action === 'superlike' && dailySuperLikesLeft <= 0) return;

      setSwipeDirection(action === 'like' ? 'right' : action === 'pass' ? 'left' : 'up');

      // Update quotas
      if (action === 'like') setDailyLikesLeft((prev) => prev - 1);
      if (action === 'superlike') setDailySuperLikesLeft((prev) => prev - 1);

      setSwipeHistory((prev) => [
        ...prev,
        {
          profileId: currentProfile.id,
          action,
          timestamp: Date.now(),
        },
      ]);

      // Simulate match (20% chance on like, 50% on superlike)
      const matchChance = action === 'superlike' ? 0.5 : action === 'like' ? 0.2 : 0;
      if (Math.random() < matchChance) {
        setTimeout(() => {
          setMatchedProfile(currentProfile);
          setShowMatchModal(true);
        }, 400);
      }

      setTimeout(() => {
        setSwipeDirection(null);
        setCurrentIndex((prev) => prev + 1);
      }, 300);
    },
    [currentProfile, dailyLikesLeft, dailySuperLikesLeft],
  );

  const handleUndo = useCallback(() => {
    if (swipeHistory.length === 0 || currentIndex === 0) return;
    const lastAction = swipeHistory[swipeHistory.length - 1];
    setSwipeHistory((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => prev - 1);
    if (lastAction.action === 'like') setDailyLikesLeft((prev) => prev + 1);
    if (lastAction.action === 'superlike') setDailySuperLikesLeft((prev) => prev + 1);
  }, [swipeHistory, currentIndex]);

  const handleBoost = useCallback(() => {
    if (boostActive) return;
    setBoostActive(true);
    setBoostTimeLeft(1800); // 30 minutes
    boostInterval.current = setInterval(() => {
      setBoostTimeLeft((prev) => {
        if (prev <= 1) {
          setBoostActive(false);
          if (boostInterval.current) clearInterval(boostInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [boostActive]);

  const handleNextPhoto = useCallback(() => {
    if (!currentProfile) return;
    setCurrentPhotoIndex((prev) => (prev < currentProfile.photos.length - 1 ? prev + 1 : prev));
  }, [currentProfile]);

  const handlePrevPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diffX = e.changedTouches[0].clientX - touchStartX.current;
      const diffY = e.changedTouches[0].clientY - touchStartY.current;
      if (Math.abs(diffX) > 100) {
        handleSwipe(diffX > 0 ? 'like' : 'pass');
      } else if (diffY < -100) {
        handleSwipe('superlike');
      }
    },
    [handleSwipe],
  );

  const formatBoostTime = useCallback((seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, []);

  if (loading) {
    return (
      <div className="matching-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Finding people near you...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="matching-error">
        <div className="error-icon">!</div>
        <p className="error-message">{error}</p>
        <button className="retry-btn" onClick={loadProfiles}>
          Retry
        </button>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="matching-empty">
        <div className="empty-icon">💫</div>
        <h2 className="empty-title">No more profiles</h2>
        <p className="empty-message">Check back later for new people near you</p>
        <button className="refresh-btn" onClick={loadProfiles}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="matching-page">
      {/* Boost Indicator */}
      {boostActive && (
        <div className="boost-indicator">
          <span className="boost-icon">🚀</span>
          <span className="boost-timer">{formatBoostTime(boostTimeLeft)}</span>
        </div>
      )}

      {/* Daily Quota */}
      <div className="quota-display">
        <span className="likes-left">{dailyLikesLeft} likes left</span>
        <span className="superlikes-left">{dailySuperLikesLeft} super likes</span>
      </div>

      {/* Card Stack */}
      <div className="card-stack-container">
        {/* Next card (behind) */}
        {profiles[currentIndex + 1] && (
          <div className="background-card">
            <img
              className="bg-card-photo"
              src={profiles[currentIndex + 1].photos[0]?.url}
              alt="Next"
            />
          </div>
        )}

        {/* Current card */}
        <div
          ref={cardRef}
          className={`swipe-card ${swipeDirection === 'left' ? 'swipe-left' : ''} ${swipeDirection === 'right' ? 'swipe-right' : ''} ${swipeDirection === 'up' ? 'swipe-up' : ''}`}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={() => setShowFullProfile(!showFullProfile)}
        >
          {/* Swipe indicators */}
          {swipeDirection === 'right' && <div className="swipe-indicator like-indicator">LIKE</div>}
          {swipeDirection === 'left' && <div className="swipe-indicator pass-indicator">NOPE</div>}
          {swipeDirection === 'up' && (
            <div className="swipe-indicator superlike-indicator">SUPER LIKE</div>
          )}

          {/* Photo */}
          <div className="card-photo-area">
            <img
              className="card-photo"
              src={currentProfile.photos[currentPhotoIndex]?.url}
              alt={currentProfile.displayName}
            />

            {/* Photo navigation dots */}
            <div className="photo-dots">
              {currentProfile.photos.map((_, idx) => (
                <span
                  key={idx}
                  className={`photo-dot ${idx === currentPhotoIndex ? 'active' : ''}`}
                />
              ))}
            </div>

            {/* Photo navigation areas */}
            <div
              className="photo-nav-left"
              onClick={(e) => {
                e.stopPropagation();
                handlePrevPhoto();
              }}
            />
            <div
              className="photo-nav-right"
              onClick={(e) => {
                e.stopPropagation();
                handleNextPhoto();
              }}
            />

            {/* Verification badge */}
            {currentProfile.isVerified && (
              <div className="verified-badge">
                <span className="verified-icon">&#10003;</span>
                <span className="verified-text">Verified</span>
              </div>
            )}

            {/* Distance */}
            <div className="distance-badge">
              <span>{currentProfile.distance} km away</span>
            </div>
          </div>

          {/* Card Info */}
          <div className="card-info-section">
            <div className="name-age-row">
              <h2 className="profile-name">{currentProfile.displayName}</h2>
              <span className="profile-age">{currentProfile.age}</span>
            </div>

            <div className="job-info">
              <span className="job-icon">💼</span>
              <span>
                {currentProfile.job} at {currentProfile.company}
              </span>
            </div>

            <p className="profile-bio">{currentProfile.bio}</p>

            {/* Common interests */}
            <div className="interests-tags">
              {currentProfile.interests.map((interest) => (
                <span key={interest} className="interest-tag">
                  {interest}
                </span>
              ))}
            </div>

            {/* Prompts (shown in expanded view) */}
            {showFullProfile && (
              <div className="profile-prompts">
                {currentProfile.prompts.map((prompt, idx) => (
                  <div key={idx} className="prompt-card">
                    <h4 className="prompt-question">{prompt.question}</h4>
                    <p className="prompt-answer">{prompt.answer}</p>
                  </div>
                ))}
                <div className="extra-info">
                  <p>
                    <span className="info-label">Height:</span> {currentProfile.height}
                  </p>
                  <p>
                    <span className="info-label">Education:</span> {currentProfile.education}
                  </p>
                  <p>
                    <span className="info-label">Looking for:</span> {currentProfile.lookingFor}
                  </p>
                  <p>
                    <span className="info-label">Lives in:</span> {currentProfile.city}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="swipe-actions">
        <button
          className="action-btn undo-btn"
          onClick={handleUndo}
          disabled={swipeHistory.length === 0}
        >
          <span className="btn-icon">↩️</span>
        </button>
        <button className="action-btn pass-btn" onClick={() => handleSwipe('pass')}>
          <span className="btn-icon pass-icon">&#10005;</span>
        </button>
        <button
          className="action-btn superlike-btn"
          onClick={() => handleSwipe('superlike')}
          disabled={dailySuperLikesLeft <= 0}
        >
          <span className="btn-icon superlike-icon">&#9733;</span>
        </button>
        <button
          className="action-btn like-btn"
          onClick={() => handleSwipe('like')}
          disabled={dailyLikesLeft <= 0}
        >
          <span className="btn-icon like-icon">&#10084;</span>
        </button>
        <button
          className={`action-btn boost-btn ${boostActive ? 'active' : ''}`}
          onClick={handleBoost}
        >
          <span className="btn-icon">🚀</span>
        </button>
      </div>

      {/* Match Modal */}
      {showMatchModal && matchedProfile && (
        <div className="match-modal-overlay" onClick={() => setShowMatchModal(false)}>
          <div className="match-modal" onClick={(e) => e.stopPropagation()}>
            <div className="match-celebration">
              <h1 className="match-title">It's a Match!</h1>
              <p className="match-subtitle">
                You and {matchedProfile.displayName} liked each other
              </p>
              <div className="match-photos">
                <img
                  className="match-photo"
                  src={matchedProfile.photos[0]?.url}
                  alt={matchedProfile.displayName}
                />
              </div>
            </div>
            <div className="match-actions">
              <button className="send-message-btn">Send a Message</button>
              <button className="keep-swiping-btn" onClick={() => setShowMatchModal(false)}>
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchingPage;
