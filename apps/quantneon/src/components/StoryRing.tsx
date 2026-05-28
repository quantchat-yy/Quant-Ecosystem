// ============================================================================
// QuantNeon - StoryRing Component
// ============================================================================

interface StoryRingProps {
  userId: string;
  username: string;
  avatarUrl: string;
  hasUnviewed: boolean;
  isCloseFriend: boolean;
  onClick?: () => void;
}

export function StoryRing({
  userId,
  username,
  avatarUrl,
  hasUnviewed,
  isCloseFriend,
  onClick,
}: StoryRingProps) {
  const ringColor = hasUnviewed
    ? isCloseFriend
      ? 'from-green-400 to-green-600'
      : 'from-pink-500 via-red-500 to-yellow-500'
    : 'from-gray-400 to-gray-500';

  const displayName = username.length > 10 ? username.substring(0, 9) + '...' : username;

  return (
    <button
      className="flex flex-col items-center gap-1.5 min-w-[68px]"
      data-user={userId}
      onClick={onClick}
      aria-label={`${username}'s story${hasUnviewed ? ' (new)' : ''}${isCloseFriend ? ' (close friend)' : ''}`}
    >
      <div className={`p-[2.5px] rounded-full bg-gradient-to-br ${ringColor}`}>
        <div className="p-[2px] bg-white rounded-full">
          <img src={avatarUrl} alt={username} className="w-14 h-14 rounded-full object-cover" />
        </div>
      </div>
      <span className="text-xs text-gray-800 truncate w-16 text-center">{displayName}</span>
    </button>
  );
}

export default StoryRing;
