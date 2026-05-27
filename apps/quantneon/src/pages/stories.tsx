// ============================================================================
// QuantNeon - Stories Viewer
// ============================================================================

import React, { useState, useCallback } from 'react';
import { LoadingState, ErrorState, EmptyState } from '@quant/shared-ui';
import { useStories } from '../hooks/useStories';

const StoriesPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useStories();
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);

  if (isLoading) return <LoadingState variant="spinner" text="Loading stories..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => void refetch()} />;

  const stories: {
    id: string;
    username?: string;
    avatar?: string;
    mediaUrl?: string;
    createdAt?: string;
  }[] = (data ?? []) as any[];

  if (stories.length === 0) {
    return (
      <EmptyState
        title="No stories"
        description="Stories from people you follow will appear here"
      />
    );
  }

  const currentStory = stories[currentStoryIndex];

  const handleNext = useCallback(() => {
    setCurrentStoryIndex((prev) => Math.min(prev + 1, stories.length - 1));
  }, [stories.length]);

  const handlePrevious = useCallback(() => {
    setCurrentStoryIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  return (
    <div className="stories-page">
      <div className="stories-viewer" onClick={handleNext}>
        <div className="story-progress-bar">
          {stories.map((_, i) => (
            <div
              key={i}
              className={`progress-segment ${i < currentStoryIndex ? 'completed' : i === currentStoryIndex ? 'active' : ''}`}
            />
          ))}
        </div>
        <div className="story-header">
          <img className="story-avatar" src={currentStory?.avatar} alt={currentStory?.username} />
          <span className="story-username">{currentStory?.username}</span>
        </div>
        <div className="story-content">
          {currentStory?.mediaUrl && (
            <img className="story-media" src={currentStory.mediaUrl} alt="Story" />
          )}
        </div>
        <div className="story-nav">
          <div
            className="nav-left"
            onClick={(e) => {
              e.stopPropagation();
              handlePrevious();
            }}
          />
          <div
            className="nav-right"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StoriesPage;
