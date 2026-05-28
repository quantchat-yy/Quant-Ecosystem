// ============================================================================
// QuantMax - Swipe Card Component
// Tinder-style swipe card with animation support
// ============================================================================

import type { CSSProperties } from 'react';
import type { UserProfile, MatchAction } from '../types';

interface SwipeCardProps {
  profile: UserProfile;
  onSwipe: (action: MatchAction) => void;
  onViewDetails: () => void;
  swipeDirection: 'left' | 'right' | 'up' | null;
  isAnimating: boolean;
}

export function SwipeCard({
  profile,
  onSwipe,
  onViewDetails,
  swipeDirection,
  isAnimating,
}: SwipeCardProps) {
  const getSwipeStyle = (): CSSProperties => {
    if (!swipeDirection || !isAnimating) return {};
    const rotations = { left: -15, right: 15, up: 0 };
    const offsets = { left: -500, right: 500, up: 0 };
    return {
      transform: `translateX(${offsets[swipeDirection]}px) rotate(${rotations[swipeDirection]}deg)`,
      opacity: 0,
      transition: 'all 0.3s ease-out',
    };
  };

  const photoUrl = profile.photos[0]?.url || profile.avatarUrl;

  return (
    <div
      className="relative w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl bg-gray-800 select-none"
      style={getSwipeStyle()}
      aria-label={`Profile card for ${profile.displayName}`}
    >
      {/* Card Image */}
      <div
        className="relative h-[420px] bg-cover bg-center"
        style={{ backgroundImage: `url(${photoUrl})` }}
      >
        {/* Swipe Indicators */}
        {swipeDirection === 'right' && (
          <div className="absolute top-8 left-6 rotate-[-12deg] rounded-lg border-4 border-green-400 px-4 py-2">
            <span className="text-3xl font-black text-green-400">LIKE</span>
          </div>
        )}
        {swipeDirection === 'left' && (
          <div className="absolute top-8 right-6 rotate-[12deg] rounded-lg border-4 border-red-400 px-4 py-2">
            <span className="text-3xl font-black text-red-400">NOPE</span>
          </div>
        )}
        {swipeDirection === 'up' && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 rounded-lg border-4 border-blue-400 px-4 py-2">
            <span className="text-3xl font-black text-blue-400">SUPER LIKE</span>
          </div>
        )}

        {/* Verification Badge */}
        {profile.verified === 'verified' && (
          <div
            className="absolute top-4 right-4 rounded-full bg-blue-500 p-1.5"
            aria-label="Verified profile"
          >
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-gray-900/90 to-transparent" />
      </div>

      {/* Card Content */}
      <button
        type="button"
        onClick={onViewDetails}
        className="w-full text-left px-5 py-4 bg-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-400"
        aria-label={`View details for ${profile.displayName}`}
      >
        <h2 className="text-xl font-bold text-white">
          {profile.displayName}, {profile.age}
        </h2>
        {profile.job && <p className="text-sm text-gray-400 mt-0.5">{profile.job}</p>}
        <p className="text-sm text-gray-500 mt-0.5">{profile.location.city}</p>
        <div className="flex flex-wrap gap-1.5 mt-2" aria-label="Interests">
          {profile.interests.slice(0, 4).map((interest) => (
            <span
              key={interest}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-900/30 text-pink-300 border border-pink-700/40"
            >
              {interest}
            </span>
          ))}
        </div>
      </button>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-5 px-5 py-4 border-t border-gray-700">
        <button
          type="button"
          onClick={() => onSwipe('pass')}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-red-400 text-red-400 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="Pass"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onSwipe('superlike')}
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-400 text-blue-400 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400"
          aria-label="Super like"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onSwipe('like')}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-400 text-green-400 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-green-400"
          aria-label="Like"
        >
          <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default SwipeCard;
