// ============================================================================
// QuantChat - Stories Page
// Stories feed with story viewer, highlights, and creation
// ============================================================================

import React, { useState, useEffect } from 'react';
import type { Story, StoryHighlight } from '../types';
import { apiClient } from '../services/api-client';

interface StoriesPageProps {
  currentUserId: string;
}

interface StoryRing {
  userId: string;
  username: string;
  avatarUrl?: string;
  hasUnviewed: boolean;
  storyCount: number;
}

export const StoriesPage: React.FC<StoriesPageProps> = ({ currentUserId }) => {
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [friendStories, setFriendStories] = useState<StoryRing[]>([]);
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    setLoading(true);

    const [myStoriesRes, highlightsRes] = await Promise.all([
      apiClient.getMyStories(),
      apiClient.getHighlights(currentUserId),
    ]);

    if (myStoriesRes.success && myStoriesRes.data) {
      setMyStories(myStoriesRes.data);
    }
    if (highlightsRes.success && highlightsRes.data) {
      setHighlights(highlightsRes.data);
    }

    // Simulated friend stories
    setFriendStories([
      { userId: 'friend1', username: 'alex_j', hasUnviewed: true, storyCount: 3 },
      { userId: 'friend2', username: 'sarah_m', hasUnviewed: true, storyCount: 1 },
      { userId: 'friend3', username: 'mike_t', hasUnviewed: false, storyCount: 5 },
      { userId: 'friend4', username: 'emma_w', hasUnviewed: true, storyCount: 2 },
    ]);

    setLoading(false);
  };

  const handleViewStory = async (story: Story) => {
    setViewingStory(story);
    await apiClient.viewStory(story.id);
  };

  const handleCreateStory = () => {
    window.location.hash = '/camera?mode=story';
  };

  const handleReplyToStory = async (content: string) => {
    if (!viewingStory) return;
    await apiClient.replyToStory(viewingStory.id, content);
  };

  if (loading) {
    return <div className="stories-loading">Loading stories...</div>;
  }

  return (
    <div className="stories-page">
      <header className="stories-header">
        <h1>Stories</h1>
        <button className="create-story-btn" onClick={handleCreateStory}>+ Create</button>
      </header>

      {/* My Story Section */}
      <section className="my-story-section">
        <div className="story-ring my-story" onClick={myStories.length > 0 ? () => handleViewStory(myStories[0]) : handleCreateStory}>
          <div className={`ring ${myStories.length > 0 ? 'has-story' : 'add-story'}`}>
            <div className="avatar-placeholder">+</div>
          </div>
          <span className="username">My Story</span>
          <span className="story-count">{myStories.length > 0 ? `${myStories.length} stories` : 'Add to story'}</span>
        </div>
      </section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <section className="highlights-section">
          <h3>Highlights</h3>
          <div className="highlights-row">
            {highlights.map(highlight => (
              <div key={highlight.id} className="highlight-item">
                <div className="highlight-cover">
                  <img src={highlight.coverUrl} alt={highlight.title} />
                </div>
                <span className="highlight-title">{highlight.title}</span>
              </div>
            ))}
            <div className="highlight-item add-highlight">
              <div className="highlight-cover">+</div>
              <span className="highlight-title">New</span>
            </div>
          </div>
        </section>
      )}

      {/* Friends' Stories */}
      <section className="friends-stories">
        <h3>Friends</h3>
        <div className="stories-grid">
          {friendStories.map(friend => (
            <div
              key={friend.userId}
              className={`story-ring ${friend.hasUnviewed ? 'unviewed' : 'viewed'}`}
              onClick={() => {/* Load and view friend's stories */}}
            >
              <div className="ring">
                {friend.avatarUrl ? (
                  <img src={friend.avatarUrl} alt={friend.username} />
                ) : (
                  <div className="avatar-placeholder">{friend.username.charAt(0).toUpperCase()}</div>
                )}
              </div>
              <span className="username">{friend.username}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Story Viewer Overlay */}
      {viewingStory && (
        <div className="story-viewer-overlay">
          <div className="story-progress">
            {myStories.map((_, idx) => (
              <div key={idx} className={`progress-bar ${idx <= viewingIndex ? 'active' : ''}`} />
            ))}
          </div>

          <div className="story-content">
            {viewingStory.type === 'photo' && (
              <img src={viewingStory.mediaUrl} alt="Story" className="story-media" />
            )}
            {viewingStory.type === 'video' && (
              <video src={viewingStory.mediaUrl} autoPlay muted className="story-media" />
            )}
            {viewingStory.text && (
              <div className="story-text-overlay">{viewingStory.text}</div>
            )}
          </div>

          <div className="story-header">
            <span className="story-author">{viewingStory.userId}</span>
            <span className="story-time">{formatStoryTime(new Date(viewingStory.createdAt))}</span>
            <button className="close-viewer" onClick={() => setViewingStory(null)}>✕</button>
          </div>

          <div className="story-footer">
            <div className="view-count">{viewingStory.viewCount} views</div>
            <input
              type="text"
              placeholder="Reply to story..."
              className="story-reply-input"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleReplyToStory((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
          </div>

          <div className="story-navigation">
            <button className="nav-prev" onClick={() => setViewingIndex(Math.max(0, viewingIndex - 1))}>&#8249;</button>
            <button className="nav-next" onClick={() => {
              if (viewingIndex < myStories.length - 1) {
                setViewingIndex(viewingIndex + 1);
                setViewingStory(myStories[viewingIndex + 1]);
              } else {
                setViewingStory(null);
              }
            }}>&#8250;</button>
          </div>
        </div>
      )}
    </div>
  );
};

function formatStoryTime(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours === 1) return '1h ago';
  return `${hours}h ago`;
}

export default StoriesPage;
