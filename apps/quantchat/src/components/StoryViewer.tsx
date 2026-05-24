// ============================================================================
// QuantChat - StoryViewer Component
// Full-screen story viewer with progress bars, navigation, and replies
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import type { Story, StoryReply } from '../types';

interface StoryViewerProps {
  stories: Story[];
  initialIndex?: number;
  onClose: () => void;
  onReply: (storyId: string, content: string) => void;
  onScreenshot: (storyId: string) => void;
  currentUserId: string;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories, initialIndex = 0, onClose, onReply, onScreenshot, currentUserId,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const story = stories[currentIndex];

  useEffect(() => {
    startProgress();
    return () => stopProgress();
  }, [currentIndex]);

  useEffect(() => {
    if (paused) {
      stopProgress();
    } else {
      startProgress();
    }
  }, [paused]);

  const startProgress = () => {
    stopProgress();
    const duration = (story?.duration || 5) * 1000;
    const interval = 50;
    let elapsed = progress * duration;

    progressRef.current = setInterval(() => {
      elapsed += interval;
      const newProgress = elapsed / duration;

      if (newProgress >= 1) {
        goNext();
        return;
      }
      setProgress(newProgress);
    }, interval);
  };

  const stopProgress = () => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
  };

  const goNext = () => {
    stopProgress();
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    stopProgress();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      setProgress(0);
      startProgress();
    }
  };

  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    if (x < width * 0.3) {
      goPrev();
    } else if (x > width * 0.7) {
      goNext();
    } else {
      setPaused(!paused);
    }
  };

  const handleReply = () => {
    if (replyText.trim()) {
      onReply(story.id, replyText);
      setReplyText('');
      setShowReply(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') goNext();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'Escape') onClose();
    if (e.key === ' ') setPaused(!paused);
  };

  if (!story) return null;

  const isOwnStory = story.userId === currentUserId;

  return (
    <div className="story-viewer" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Progress bars */}
      <div className="progress-bars">
        {stories.map((_, idx) => (
          <div key={idx} className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress * 100}%` : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="viewer-header">
        <div className="story-author-info">
          <div className="author-avatar">
            {story.userId.charAt(0).toUpperCase()}
          </div>
          <div className="author-details">
            <span className="author-name">{story.userId}</span>
            <span className="story-time">{formatStoryAge(new Date(story.createdAt))}</span>
          </div>
        </div>
        <div className="viewer-actions">
          {paused && <span className="paused-indicator">PAUSED</span>}
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* Story content */}
      <div className="story-content" onClick={handleTap}>
        {story.type === 'photo' && (
          <img src={story.mediaUrl} alt="Story" className="story-image" />
        )}
        {story.type === 'video' && (
          <video
            src={story.mediaUrl}
            autoPlay
            muted={false}
            playsInline
            className="story-video"
            onEnded={goNext}
          />
        )}
        {story.type === 'text' && (
          <div
            className="story-text-content"
            style={story.textStyle ? {
              fontFamily: story.textStyle.fontFamily,
              fontSize: `${story.textStyle.fontSize}px`,
              color: story.textStyle.color,
              backgroundColor: story.textStyle.backgroundColor,
              textAlign: story.textStyle.alignment,
            } : undefined}
          >
            {story.text}
          </div>
        )}

        {/* Stickers */}
        {story.stickers.map(sticker => (
          <div
            key={sticker.id}
            className="story-sticker"
            style={{
              left: `${sticker.position.x}%`,
              top: `${sticker.position.y}%`,
              transform: `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
            }}
          >
            {sticker.content}
          </div>
        ))}

        {/* Music badge */}
        {story.music && (
          <div className="music-badge">
            🎵 {story.music.title} - {story.music.artist}
          </div>
        )}

        {/* Location badge */}
        {story.location && (
          <div className="location-badge">
            📍 {story.location.city || 'Unknown'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="viewer-footer">
        {isOwnStory ? (
          <div className="story-stats">
            <span className="view-count">👁️ {story.viewCount}</span>
            <span className="reply-count">💬 {story.replies.length}</span>
          </div>
        ) : (
          <div className="reply-section">
            {showReply ? (
              <div className="reply-input-container">
                <input
                  type="text"
                  placeholder="Reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                  onFocus={() => setPaused(true)}
                  onBlur={() => setPaused(false)}
                  autoFocus
                />
                <button onClick={handleReply}>Send</button>
              </div>
            ) : (
              <button className="reply-trigger" onClick={() => { setShowReply(true); setPaused(true); }}>
                Send message...
              </button>
            )}
            <div className="quick-emojis">
              {['🔥', '😍', '😂', '😮'].map(emoji => (
                <button key={emoji} onClick={() => onReply(story.id, emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation zones (visual indicators) */}
      <div className="nav-zone left" />
      <div className="nav-zone right" />
    </div>
  );
};

function formatStoryAge(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours === 1) return '1h ago';
  return `${hours}h ago`;
}

export default StoryViewer;
