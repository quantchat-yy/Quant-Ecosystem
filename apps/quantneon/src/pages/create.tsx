// ============================================================================
// QuantNeon - Create Post Flow
// Multi-image selection, filters, caption, tagging, location, share
// ============================================================================

import React, { useState, useCallback } from 'react';
import { LoadingState } from '@quant/shared-ui';

const CreatePostPage: React.FC = () => {
  const [step, setStep] = useState<'select' | 'edit' | 'caption'>('select');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    // Would call apiClient.createPost here
    setTimeout(() => setIsPublishing(false), 1000);
  }, [caption, location, selectedImages]);

  if (isPublishing) {
    return <LoadingState variant="spinner" text="Sharing your post..." />;
  }

  return (
    <div className="create-post-page">
      <div className="create-header">
        <h1>New Post</h1>
        {step === 'caption' && (
          <button
            className="share-btn"
            onClick={handlePublish}
            disabled={selectedImages.length === 0}
          >
            Share
          </button>
        )}
      </div>

      {step === 'select' && (
        <div className="image-select-step">
          <div className="gallery-grid">
            <p className="placeholder-text">Select images from your gallery</p>
          </div>
          <button
            className="next-btn"
            onClick={() => setStep('edit')}
            disabled={selectedImages.length === 0}
          >
            Next
          </button>
        </div>
      )}

      {step === 'edit' && (
        <div className="edit-step">
          <div className="filter-strip">
            <p>Apply filters</p>
          </div>
          <button className="next-btn" onClick={() => setStep('caption')}>
            Next
          </button>
        </div>
      )}

      {step === 'caption' && (
        <div className="caption-step">
          <textarea
            className="caption-input"
            placeholder="Write a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <div className="post-options">
            <input
              className="location-input"
              placeholder="Add location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePostPage;
