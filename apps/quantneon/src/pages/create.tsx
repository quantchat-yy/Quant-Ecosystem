// ============================================================================
// QuantNeon - Create Post Flow
// Multi-image selection, filters, caption, tagging, location, share
// ============================================================================

import React, { useState, useCallback } from 'react';
import { PageTransition, LoadingState } from '@quant/shared-ui';

const CreatePostPage: React.FC = () => {
  const [step, setStep] = useState<'select' | 'edit' | 'caption'>('select');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    setTimeout(() => setIsPublishing(false), 1000);
  }, []);

  if (isPublishing) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white dark:bg-[#0F0F14] flex items-center justify-center">
          <LoadingState variant="spinner" text="Sharing your post..." />
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-white dark:bg-[#0F0F14] text-gray-900 dark:text-gray-100">
        <div className="px-4 max-w-2xl mx-auto py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">New Post</h1>
            {step === 'caption' && (
              <button
                className="min-h-[44px] px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
                onClick={handlePublish}
                disabled={selectedImages.length === 0}
              >
                Share
              </button>
            )}
          </div>

          {step === 'select' && (
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400">Select images from your gallery</p>
              </div>
              <button
                className="w-full min-h-[44px] py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50"
                onClick={() => setStep('edit')}
                disabled={selectedImages.length === 0}
              >
                Next
              </button>
            </div>
          )}

          {step === 'edit' && (
            <div className="space-y-4">
              <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Apply filters</p>
              </div>
              <button
                className="w-full min-h-[44px] py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
                onClick={() => setStep('caption')}
              >
                Next
              </button>
            </div>
          )}

          {step === 'caption' && (
            <div className="space-y-4">
              <textarea
                className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none text-gray-900 dark:text-white"
                placeholder="Write a caption..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
              <input
                className="w-full h-11 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 text-sm outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                placeholder="Add location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default CreatePostPage;
