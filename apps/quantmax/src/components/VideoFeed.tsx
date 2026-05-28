// ============================================================================
// QuantMax - Video Feed Component
// Full-screen video scroller with engagement actions
// ============================================================================

import type { ShortVideo } from '../types';

interface VideoFeedProps {
  videos: ShortVideo[];
  activeIndex: number;
  onScroll: (direction: 'up' | 'down') => void;
  onDoubleTap: (videoId: string) => void;
  onLongPress: (videoId: string) => void;
}

export function VideoFeed({
  videos,
  activeIndex,
  // TODO: wire up handler
  onScroll: _onScroll,
  onDoubleTap,
  onLongPress,
}: VideoFeedProps) {
  return (
    <div
      className="relative h-full w-full overflow-hidden bg-black"
      role="feed"
      aria-label="Video feed"
    >
      {videos.map((video, index) => (
        <div
          key={video.id}
          className={`absolute inset-0 transition-opacity duration-300 ${
            index === activeIndex ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
          }`}
          aria-hidden={index !== activeIndex}
        >
          {/* Video */}
          <video
            src={video.videoUrl}
            loop
            autoPlay={index === activeIndex}
            muted={index !== activeIndex}
            className="h-full w-full object-cover"
            aria-label={`Video by ${video.creator.username}`}
            onDoubleClick={() => onDoubleTap(video.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              onLongPress(video.id);
            }}
          />

          {/* Info Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-4 pb-20 bg-gradient-to-t from-black/70 to-transparent">
            <span className="text-sm font-bold text-white">@{video.creator.username}</span>
            <p className="mt-1 text-sm text-gray-200 line-clamp-2">{video.caption}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-300" aria-hidden="true">
                &#9835;
              </span>
              <span className="text-xs text-gray-300 truncate">{video.sound.name}</span>
            </div>
          </div>

          {/* Engagement Sidebar */}
          <div
            className="absolute right-3 bottom-32 flex flex-col items-center gap-5"
            role="group"
            aria-label="Engagement actions"
          >
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => onDoubleTap(video.id)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-800/60 text-white transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-400"
                aria-label={`Like video, ${video.likes} likes`}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
              <span className="mt-1 text-xs text-white">{video.likes}</span>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-800/60 text-white"
                aria-label={`${video.comments} comments`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <span className="mt-1 text-xs text-white">{video.comments}</span>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-800/60 text-white"
                aria-label={`${video.shares} shares`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </div>
              <span className="mt-1 text-xs text-white">{video.shares}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default VideoFeed;
