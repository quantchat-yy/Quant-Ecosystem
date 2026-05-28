// ============================================================================
// QuantMax - Match Profile Component
// ============================================================================

import type { UserProfile } from '../types';

interface MatchProfileProps {
  profile: UserProfile;
  compatibility: number;
  onMessage: () => void;
  onUnmatch: () => void;
}

export function MatchProfile({ profile, compatibility, onMessage, onUnmatch }: MatchProfileProps) {
  const photoUrl = profile.photos[0]?.url || profile.avatarUrl;

  return (
    <article
      className="flex flex-col items-center rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg"
      aria-label={`Match profile for ${profile.displayName}`}
    >
      {/* Compatibility Score */}
      <div className="mb-4 rounded-full bg-pink-900/30 px-4 py-1 border border-pink-600/40">
        <span
          className="text-sm font-bold text-pink-300"
          aria-label={`${compatibility}% compatible`}
        >
          {compatibility}% Compatible
        </span>
      </div>

      {/* Profile Photo */}
      <img
        src={photoUrl}
        alt={`${profile.displayName}'s photo`}
        className="h-32 w-32 rounded-full object-cover border-4 border-pink-500/40 mb-4"
      />

      {/* Name and Age */}
      <h2 className="text-xl font-bold text-white">
        {profile.displayName}, {profile.age}
      </h2>

      {/* Bio */}
      <p className="mt-2 text-sm text-gray-300 text-center line-clamp-3">{profile.bio}</p>

      {/* Actions */}
      <div className="mt-6 flex w-full gap-3">
        <button
          type="button"
          onClick={onMessage}
          className="flex-1 min-h-[44px] rounded-xl bg-pink-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-400"
          aria-label={`Message ${profile.displayName}`}
        >
          Message
        </button>
        <button
          type="button"
          onClick={onUnmatch}
          className="flex-1 min-h-[44px] rounded-xl bg-gray-700 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-900/40 focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label={`Unmatch ${profile.displayName}`}
        >
          Unmatch
        </button>
      </div>
    </article>
  );
}

export default MatchProfile;
