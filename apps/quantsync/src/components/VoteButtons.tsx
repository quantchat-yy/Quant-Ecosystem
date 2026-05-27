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
  return {
    type: 'div',
    className: `vote-buttons ${orientation} size-${size}`,
    children: [
      {
        type: 'button',
        className: `upvote-btn ${userVote === 'up' ? 'active' : ''}`,
        onClick: onUpvote,
        'aria-label': 'Upvote',
        children: [{ type: 'span', className: 'vote-icon up' }],
      },
      {
        type: 'span',
        className: `vote-score ${score > 0 ? 'positive' : score < 0 ? 'negative' : ''}`,
        text: formatScore(score),
      },
      {
        type: 'button',
        className: `downvote-btn ${userVote === 'down' ? 'active' : ''}`,
        onClick: onDownvote,
        'aria-label': 'Downvote',
        children: [{ type: 'span', className: 'vote-icon down' }],
      },
    ],
  };
}

function formatScore(score: number): string {
  if (Math.abs(score) >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
  if (Math.abs(score) >= 1000) return `${(score / 1000).toFixed(1)}K`;
  return String(score);
}

export default VoteButtons;
