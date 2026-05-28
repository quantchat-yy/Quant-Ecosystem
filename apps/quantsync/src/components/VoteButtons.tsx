// ============================================================================
// QuantSync - VoteButtons Component
// Upvote/Downvote buttons with score display
// ============================================================================

interface VoteButtonsProps {
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: 'up' | 'down' | null;
  onUpvote: () => void;
  onDownvote: () => void;
  size?: 'small' | 'medium' | 'large';
  orientation?: 'horizontal' | 'vertical';
}

export function VoteButtons({
  upvotes: _upvotes,
  downvotes: _downvotes,
  score,
  userVote,
  onUpvote,
  onDownvote,
  size = 'medium',
  orientation = 'vertical',
}: VoteButtonsProps) {
  const sizeClasses = {
    small: 'h-11 w-11 text-xs',
    medium: 'h-11 w-11 text-sm',
    large: 'h-11 w-11 text-base',
  };

  const iconScale = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-xl',
  };

  const containerClasses =
    orientation === 'vertical' ? 'flex flex-col items-center gap-1' : 'flex items-center gap-2';

  return (
    <div className={containerClasses} role="group" aria-label="Vote buttons">
      <button
        type="button"
        className={`${sizeClasses[size]} flex items-center justify-center rounded-md transition-colors ${
          userVote === 'up'
            ? 'bg-orange-100 text-orange-600'
            : 'text-gray-400 hover:bg-gray-100 hover:text-orange-500'
        }`}
        onClick={onUpvote}
        aria-label="Upvote"
        aria-pressed={userVote === 'up'}
      >
        <span className={iconScale[size]} aria-hidden="true">
          &#9650;
        </span>
      </button>
      <span
        className={`text-sm font-bold ${
          score > 0 ? 'text-orange-600' : score < 0 ? 'text-blue-600' : 'text-gray-600'
        }`}
        aria-label={`Score: ${score}`}
      >
        {formatScore(score)}
      </span>
      <button
        type="button"
        className={`${sizeClasses[size]} flex items-center justify-center rounded-md transition-colors ${
          userVote === 'down'
            ? 'bg-blue-100 text-blue-600'
            : 'text-gray-400 hover:bg-gray-100 hover:text-blue-500'
        }`}
        onClick={onDownvote}
        aria-label="Downvote"
        aria-pressed={userVote === 'down'}
      >
        <span className={iconScale[size]} aria-hidden="true">
          &#9660;
        </span>
      </button>
    </div>
  );
}

function formatScore(score: number): string {
  if (Math.abs(score) >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
  if (Math.abs(score) >= 1000) return `${(score / 1000).toFixed(1)}K`;
  return String(score);
}

export default VoteButtons;
