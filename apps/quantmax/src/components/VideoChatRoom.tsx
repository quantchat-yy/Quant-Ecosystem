// ============================================================================
// QuantMax - Video Chat Room Component
// Video chat with controls, text fallback, and safety features
// ============================================================================

import type { VideoChat } from '../types';

interface VideoChatRoomProps {
  session: VideoChat;
  isCameraOn: boolean;
  isMicOn: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onSkip: () => void;
  onEnd: () => void;
  onReport: () => void;
  onScreenshot: () => void;
}

export function VideoChatRoom({
  session,
  isCameraOn,
  isMicOn,
  onToggleCamera,
  onToggleMic,
  onSkip,
  onEnd,
  onReport,
  onScreenshot: _onScreenshot,
}: VideoChatRoomProps) {
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="relative flex h-full w-full flex-col bg-gray-900"
      role="region"
      aria-label="Video chat room"
    >
      {/* Connection Bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-800/80 border-b border-gray-700">
        <span
          className="h-2.5 w-2.5 rounded-full bg-green-400 animate-pulse"
          aria-label="Connected"
        />
        <span className="text-sm font-medium text-gray-200">
          Connected - {formatDuration(session.duration)}
        </span>
        {session.matchedInterests.length > 0 && (
          <span className="ml-auto text-xs text-gray-400 truncate">
            Common: {session.matchedInterests.join(', ')}
          </span>
        )}
      </div>

      {/* Video Area */}
      <div className="relative flex-1 flex items-center justify-center bg-black">
        {/* Remote Video */}
        <div className="absolute inset-0 flex items-center justify-center">
          <video
            className="h-full w-full object-cover"
            autoPlay
            aria-label="Remote participant video"
          />
        </div>

        {/* Local Video PIP */}
        <div className="absolute bottom-4 right-4 h-36 w-28 overflow-hidden rounded-xl border-2 border-gray-600 shadow-lg">
          {isCameraOn ? (
            <video className="h-full w-full object-cover" autoPlay muted aria-label="Your video" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gray-800">
              <span className="text-xs text-gray-400">Camera Off</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Bar */}
      <div
        className="flex items-center justify-center gap-4 px-4 py-4 bg-gray-800/90 border-t border-gray-700"
        role="toolbar"
        aria-label="Video chat controls"
      >
        <button
          type="button"
          onClick={onToggleCamera}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 ${
            isCameraOn ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'
          }`}
          aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
          aria-pressed={isCameraOn}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={onToggleMic}
          className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-pink-400 ${
            isMicOn ? 'bg-gray-700 text-white' : 'bg-red-600 text-white'
          }`}
          aria-label={isMicOn ? 'Mute microphone' : 'Unmute microphone'}
          aria-pressed={isMicOn}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={onSkip}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-600 text-white transition-colors hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          aria-label="Skip to next person"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={onEnd}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-label="End call"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z"
            />
          </svg>
        </button>

        <button
          type="button"
          onClick={onReport}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-700 text-orange-400 transition-colors hover:bg-orange-900/30 focus:outline-none focus:ring-2 focus:ring-orange-400"
          aria-label="Report user"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default VideoChatRoom;
