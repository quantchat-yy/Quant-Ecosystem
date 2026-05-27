// ============================================================================
// QuantSync - PostCard Component
// Full post card with interactions, media gallery, poll, verification badge
// ============================================================================

import React, { useState, useCallback } from 'react';

interface PostMedia {
  url: string;
  type: 'image' | 'video' | 'gif';
  thumbnail?: string;
  alt?: string;
}

interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface PostCardProps {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  isVerified: boolean;
  verificationType?: 'blue' | 'gold' | 'gray';
  content: string;
  media: PostMedia[];
  poll?: {
    options: PollOption[];
    totalVotes: number;
    endsAt: string;
    hasVoted: boolean;
    votedOptionId?: string;
  };
  likes: number;
  reposts: number;
  replies: number;
  quotes: number;
  bookmarks: number;
  isLiked: boolean;
  isReposted: boolean;
  isBookmarked: boolean;
  createdAt: string;
  isThreadStart?: boolean;
  threadLength?: number;
  communityName?: string;
  onLike?: (id: string) => void;
  onRepost?: (id: string) => void;
  onBookmark?: (id: string) => void;
  onReply?: (id: string) => void;
  onShare?: (id: string) => void;
  onMute?: (authorId: string) => void;
  onBlock?: (authorId: string) => void;
  onReport?: (id: string) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  id,
  authorId,
  authorName,
  authorHandle,
  authorAvatar,
  isVerified,
  verificationType,
  content,
  media,
  poll,
  likes,
  reposts,
  replies,
  quotes: _quotes,
  bookmarks: _bookmarks,
  isLiked,
  isReposted,
  isBookmarked,
  createdAt,
  isThreadStart,
  threadLength,
  communityName,
  onLike,
  onRepost,
  onBookmark,
  onReply,
  onShare: _onShare,
  onMute,
  onBlock,
  onReport,
}) => {
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);
  const [localLiked, setLocalLiked] = useState<boolean>(isLiked);
  const [localLikes, setLocalLikes] = useState<number>(likes);
  const [localReposted, setLocalReposted] = useState<boolean>(isReposted);
  const [localReposts, setLocalReposts] = useState<number>(reposts);
  const [localBookmarked, setLocalBookmarked] = useState<boolean>(isBookmarked);
  const [selectedPollOption, setSelectedPollOption] = useState<string | null>(
    poll?.votedOptionId || null,
  );
  const [_mediaIndex, _setMediaIndex] = useState<number>(0);

  const handleLike = useCallback(() => {
    setLocalLiked(!localLiked);
    setLocalLikes(localLiked ? localLikes - 1 : localLikes + 1);
    onLike?.(id);
  }, [localLiked, localLikes, id, onLike]);

  const handleRepost = useCallback(() => {
    setLocalReposted(!localReposted);
    setLocalReposts(localReposted ? localReposts - 1 : localReposts + 1);
    onRepost?.(id);
  }, [localReposted, localReposts, id, onRepost]);

  const handleBookmark = useCallback(() => {
    setLocalBookmarked(!localBookmarked);
    onBookmark?.(id);
  }, [localBookmarked, id, onBookmark]);

  const handleVote = useCallback(
    async (optionId: string) => {
      if (selectedPollOption) return;
      setSelectedPollOption(optionId);
      await fetch(`/api/posts/${id}/poll/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      });
    },
    [selectedPollOption, id],
  );

  const formatTime = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCount = (n: number): string => {
    if (n === 0) return '';
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toString();
  };

  const getVerificationColor = (): string => {
    if (verificationType === 'gold') return 'text-yellow-500';
    if (verificationType === 'gray') return 'text-gray-500';
    return 'text-blue-500';
  };

  const highlightContent = (text: string): React.ReactNode => {
    const parts = text.split(/(@\w+|#\w+|https?:\/\/\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@'))
        return (
          <span key={i} className="text-blue-500 hover:underline cursor-pointer">
            {part}
          </span>
        );
      if (part.startsWith('#'))
        return (
          <span key={i} className="text-blue-500 hover:underline cursor-pointer">
            {part}
          </span>
        );
      if (part.startsWith('http'))
        return (
          <a
            key={i}
            href={part}
            className="text-blue-500 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {part.length > 30 ? part.slice(0, 30) + '...' : part}
          </a>
        );
      return part;
    });
  };

  return (
    <article className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer border-b">
      {isThreadStart && threadLength && threadLength > 1 && (
        <div className="text-xs text-blue-500 ml-14 mb-1">🧵 Thread ({threadLength} posts)</div>
      )}
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-12 h-12 rounded-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold text-gray-900 truncate text-sm">{authorName}</span>
              {isVerified && (
                <span
                  className={`${getVerificationColor()} text-sm`}
                  title={`Verified (${verificationType || 'blue'})`}
                >
                  ✓
                </span>
              )}
              <span className="text-gray-500 text-sm truncate">@{authorHandle}</span>
              <span className="text-gray-400 mx-0.5">·</span>
              <span className="text-gray-500 text-sm flex-shrink-0">{formatTime(createdAt)}</span>
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                ⋯
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border rounded-xl shadow-lg py-1 w-48 z-20">
                  <button
                    onClick={() => {
                      onMute?.(authorId);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Mute @{authorHandle}
                  </button>
                  <button
                    onClick={() => {
                      onBlock?.(authorId);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-red-600"
                  >
                    Block @{authorHandle}
                  </button>
                  <button
                    onClick={() => {
                      onReport?.(id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                  >
                    Report post
                  </button>
                </div>
              )}
            </div>
          </div>

          {communityName && (
            <div className="text-xs text-purple-600 mb-0.5">in {communityName}</div>
          )}

          <div className="text-gray-900 whitespace-pre-wrap break-words mb-2 text-[15px]">
            {highlightContent(content)}
          </div>

          {media.length > 0 && (
            <div
              className={`rounded-xl overflow-hidden mb-2 border ${media.length === 1 ? '' : 'grid grid-cols-2 gap-0.5'}`}
            >
              {media.map((m, idx) => (
                <div
                  key={idx}
                  className={`relative ${media.length === 1 ? 'aspect-video' : 'aspect-square'} bg-gray-100`}
                >
                  {m.type === 'video' ? (
                    <video
                      src={m.url}
                      poster={m.thumbnail}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    <img
                      src={m.url}
                      alt={m.alt || ''}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {poll && (
            <div className="border rounded-xl p-3 mb-2">
              {poll.options.map((opt) => {
                const pct =
                  poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                const isSelected = selectedPollOption === opt.id;
                const showResults = !!selectedPollOption || poll.hasVoted;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    disabled={!!selectedPollOption}
                    className="w-full mb-2 last:mb-0"
                  >
                    <div className="relative h-9 rounded-full overflow-hidden border">
                      {showResults && (
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-100 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-between px-3">
                        <span className={`text-sm ${isSelected ? 'font-bold' : ''}`}>
                          {opt.text} {isSelected && '✓'}
                        </span>
                        {showResults && <span className="text-sm text-gray-600">{pct}%</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <span>{poll.totalVotes} votes</span>
                <span>·</span>
                <span>
                  {new Date(poll.endsAt) > new Date()
                    ? 'Ends ' + new Date(poll.endsAt).toLocaleDateString()
                    : 'Final results'}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-1 max-w-md -ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply?.(id);
              }}
              className="flex items-center gap-1 text-gray-500 hover:text-blue-500 group"
            >
              <span className="p-2 rounded-full group-hover:bg-blue-50 text-sm">💬</span>
              <span className="text-xs">{formatCount(replies)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRepost();
              }}
              className={`flex items-center gap-1 group ${localReposted ? 'text-green-500' : 'text-gray-500 hover:text-green-500'}`}
            >
              <span className="p-2 rounded-full group-hover:bg-green-50 text-sm">🔄</span>
              <span className="text-xs">{formatCount(localReposts)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className={`flex items-center gap-1 group ${localLiked ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}
            >
              <span className="p-2 rounded-full group-hover:bg-red-50 text-sm">
                {localLiked ? '❤️' : '🤍'}
              </span>
              <span className="text-xs">{formatCount(localLikes)}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleBookmark();
              }}
              className={`flex items-center gap-1 group ${localBookmarked ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'}`}
            >
              <span className="p-2 rounded-full group-hover:bg-blue-50 text-sm">
                {localBookmarked ? '🔖' : '📑'}
              </span>
            </button>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareMenu(!showShareMenu);
                }}
                className="p-2 rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-50 text-sm"
              >
                ↗️
              </button>
              {showShareMenu && (
                <div className="absolute bottom-full right-0 mb-1 bg-white border rounded-xl shadow-lg py-1 w-36 z-20">
                  <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50">
                    Copy link
                  </button>
                  <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50">
                    Send via DM
                  </button>
                  <button className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50">
                    Quote
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default PostCard;
