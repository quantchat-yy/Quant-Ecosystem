// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantNeon - Create Post Flow
// Multi-image selection, filters, caption, tagging, location, share
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SelectedImage {
  id: string;
  url: string;
  order: number;
  filter: string;
  rotation: number;
  cropMode: 'original' | 'square' | '4:5' | '16:9';
}

interface TaggedPerson {
  id: string;
  username: string;
  x: number;
  y: number;
}

interface LocationResult {
  id: string;
  name: string;
  address: string;
}

interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverUrl: string;
}

interface GalleryImage {
  id: string;
  url: string;
  isSelected: boolean;
  order: number | null;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const AVAILABLE_FILTERS = [
  'Normal',
  'Clarendon',
  'Gingham',
  'Moon',
  'Lark',
  'Reyes',
  'Juno',
  'Slumber',
  'Crema',
  'Ludwig',
  'Aden',
  'Perpetua',
];

const generateGalleryImages = (): GalleryImage[] => {
  return Array.from({ length: 24 }, (_, i) => ({
    id: `gallery-${i}`,
    url: `https://picsum.photos/seed/gallery${i}/300/300`,
    isSelected: false,
    order: null,
  }));
};

const LOCATION_RESULTS: LocationResult[] = [
  { id: 'l1', name: 'Times Square', address: 'Manhattan, New York, NY' },
  { id: 'l2', name: 'Central Park', address: 'New York, NY' },
  { id: 'l3', name: 'Brooklyn Bridge', address: 'Brooklyn, NY' },
  { id: 'l4', name: 'Empire State Building', address: 'Midtown Manhattan, NY' },
  { id: 'l5', name: 'Statue of Liberty', address: 'Liberty Island, NY' },
];

const MUSIC_RESULTS: MusicTrack[] = [
  {
    id: 'mt1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: '3:20',
    coverUrl: 'https://picsum.photos/seed/music1/60/60',
  },
  {
    id: 'mt2',
    title: 'Levitating',
    artist: 'Dua Lipa',
    duration: '3:24',
    coverUrl: 'https://picsum.photos/seed/music2/60/60',
  },
  {
    id: 'mt3',
    title: 'Watermelon Sugar',
    artist: 'Harry Styles',
    duration: '2:54',
    coverUrl: 'https://picsum.photos/seed/music3/60/60',
  },
  {
    id: 'mt4',
    title: 'Save Your Tears',
    artist: 'The Weeknd',
    duration: '3:36',
    coverUrl: 'https://picsum.photos/seed/music4/60/60',
  },
];

const MAX_CAPTION_LENGTH = 2200;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CreatePostPage: React.FC = () => {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [caption, setCaption] = useState<string>('');
  const [taggedPeople, setTaggedPeople] = useState<TaggedPerson[]>([]);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [music, setMusic] = useState<MusicTrack | null>(null);
  const [sharing, setSharing] = useState<boolean>(false);
  const [shareToStories, setShareToStories] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState<number>(0);
  const [showLocationSearch, setShowLocationSearch] = useState<boolean>(false);
  const [showMusicSearch, setShowMusicSearch] = useState<boolean>(false);
  const [showTagPeople, setShowTagPeople] = useState<boolean>(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [locationQuery, setLocationQuery] = useState<string>('');
  const [musicQuery, setMusicQuery] = useState<string>('');
  const [tagQuery, setTagQuery] = useState<string>('');
  const [altTexts, setAltTexts] = useState<Record<string, string>>({});
  const [disableComments, setDisableComments] = useState<boolean>(false);
  const [hideLikeCounts, setHideLikeCounts] = useState<boolean>(false);

  const captionRef = useRef<HTMLTextAreaElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  // Load gallery
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 400));
        setGalleryImages(generateGalleryImages());
      } catch (err) {
        setError('Failed to load gallery.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Select/deselect image
  const handleToggleImage = useCallback((imageId: string) => {
    setGalleryImages((prev) => {
      const image = prev.find((img) => img.id === imageId);
      if (!image) return prev;

      if (image.isSelected) {
        // Deselect
        const removedOrder = image.order;
        return prev.map((img) => {
          if (img.id === imageId) return { ...img, isSelected: false, order: null };
          if (img.order !== null && removedOrder !== null && img.order > removedOrder) {
            return { ...img, order: img.order - 1 };
          }
          return img;
        });
      } else {
        // Select (max 10)
        const selectedCount = prev.filter((img) => img.isSelected).length;
        if (selectedCount >= 10) return prev;
        const newOrder = selectedCount + 1;
        return prev.map((img) =>
          img.id === imageId ? { ...img, isSelected: true, order: newOrder } : img,
        );
      }
    });
  }, []);

  // Sync selected images to preview
  useEffect(() => {
    const selected = galleryImages
      .filter((img) => img.isSelected)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((img) => ({
        id: img.id,
        url: img.url,
        order: img.order || 0,
        filter: 'Normal',
        rotation: 0,
        cropMode: 'square' as const,
      }));
    setSelectedImages(selected);
    if (selected.length > 0 && currentPreviewIndex >= selected.length) {
      setCurrentPreviewIndex(selected.length - 1);
    }
  }, [galleryImages]);

  // Filter change for selected image
  const handleFilterChange = useCallback((imageId: string, filter: string) => {
    setSelectedImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, filter } : img)));
  }, []);

  // Rotation
  const handleRotate = useCallback((imageId: string) => {
    setSelectedImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, rotation: (img.rotation + 90) % 360 } : img,
      ),
    );
  }, []);

  // Crop mode
  const handleCropChange = useCallback((imageId: string, cropMode: SelectedImage['cropMode']) => {
    setSelectedImages((prev) =>
      prev.map((img) => (img.id === imageId ? { ...img, cropMode } : img)),
    );
  }, []);

  // Location
  const handleSelectLocation = useCallback((loc: LocationResult) => {
    setLocation(loc);
    setShowLocationSearch(false);
    setLocationQuery('');
  }, []);

  // Music
  const handleSelectMusic = useCallback((track: MusicTrack) => {
    setMusic(track);
    setShowMusicSearch(false);
    setMusicQuery('');
  }, []);

  // Tag person
  const handleTagPerson = useCallback((username: string) => {
    const newTag: TaggedPerson = {
      id: `tag-${Date.now()}`,
      username,
      x: 50,
      y: 50,
    };
    setTaggedPeople((prev) => [...prev, newTag]);
    setTagQuery('');
    setShowTagPeople(false);
  }, []);

  const handleRemoveTag = useCallback((tagId: string) => {
    setTaggedPeople((prev) => prev.filter((t) => t.id !== tagId));
  }, []);

  // Share/Post
  const handleShare = useCallback(async () => {
    if (selectedImages.length === 0) return;
    setSharing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSharing(false);
    // Navigate back on success
  }, [selectedImages]);

  const filteredLocations = LOCATION_RESULTS.filter((l) =>
    l.name.toLowerCase().includes(locationQuery.toLowerCase()),
  );

  const filteredMusic = MUSIC_RESULTS.filter(
    (m) =>
      m.title.toLowerCase().includes(musicQuery.toLowerCase()) ||
      m.artist.toLowerCase().includes(musicQuery.toLowerCase()),
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading gallery...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <p className="text-white text-center">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setGalleryImages(generateGalleryImages());
              setLoading(false);
            }}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-sm border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-gray-400 hover:text-white"
        >
          Cancel
        </button>
        <h1 className="font-semibold">New Post</h1>
        <button
          onClick={handleShare}
          disabled={selectedImages.length === 0 || sharing}
          className={`text-sm font-semibold ${
            selectedImages.length > 0 && !sharing
              ? 'text-blue-500 hover:text-blue-400'
              : 'text-blue-500/50 cursor-not-allowed'
          }`}
        >
          {sharing ? 'Sharing...' : 'Share'}
        </button>
      </header>

      {/* Selected images preview */}
      {selectedImages.length > 0 && (
        <div className="border-b border-gray-800">
          <div ref={previewScrollRef} className="flex overflow-x-auto scrollbar-hide">
            {selectedImages.map((img, i) => (
              <div
                key={img.id}
                className={`relative flex-shrink-0 w-64 aspect-square cursor-pointer ${
                  i === currentPreviewIndex ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setCurrentPreviewIndex(i)}
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ transform: `rotate(${img.rotation}deg)` }}
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRotate(img.id);
                    }}
                    className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white text-xs"
                  >
                    ↻
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/60 rounded px-1.5 py-0.5">
                  <span className="text-[10px] text-white">{img.filter}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Per-image filter selector */}
          {selectedImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
              {AVAILABLE_FILTERS.map((filter) => (
                <button
                  key={filter}
                  onClick={() =>
                    handleFilterChange(selectedImages[currentPreviewIndex]?.id || '', filter)
                  }
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all ${
                    selectedImages[currentPreviewIndex]?.filter === filter
                      ? 'bg-white text-black font-medium'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Image selection grid */}
      <div className="flex-1 overflow-y-auto">
        {selectedImages.length === 0 && (
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">Gallery</span>
            <span className="text-xs text-gray-400">Select up to 10 images</span>
          </div>
        )}

        <div className="grid grid-cols-4 gap-0.5 px-0.5">
          {galleryImages.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square cursor-pointer overflow-hidden"
              onClick={() => handleToggleImage(image.id)}
            >
              <img src={image.url} alt="" className="w-full h-full object-cover" loading="lazy" />
              {image.isSelected && (
                <div className="absolute inset-0 bg-white/20">
                  <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{image.order}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Caption and Options */}
      {selectedImages.length > 0 && (
        <div className="border-t border-gray-800 bg-gray-950">
          {/* Caption */}
          <div className="px-4 py-3 border-b border-gray-800">
            <textarea
              ref={captionRef}
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION_LENGTH))}
              placeholder="Write a caption..."
              className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none resize-none min-h-[60px]"
              rows={3}
            />
            <div className="flex items-center justify-between mt-1">
              <span
                className={`text-xs ${caption.length > MAX_CAPTION_LENGTH * 0.9 ? 'text-orange-400' : 'text-gray-500'}`}
              >
                {caption.length}/{MAX_CAPTION_LENGTH}
              </span>
              {location && (
                <div className="flex items-center gap-1 text-xs text-blue-400">
                  <span>📍 {location.name}</span>
                  <button
                    onClick={() => setLocation(null)}
                    className="text-gray-500 hover:text-white ml-1"
                  >
                    x
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="divide-y divide-gray-800">
            {/* Tag People */}
            <button
              onClick={() => setShowTagPeople(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50"
            >
              <span className="text-sm">Tag People</span>
              <div className="flex items-center gap-2">
                {taggedPeople.length > 0 && (
                  <span className="text-xs text-gray-400">{taggedPeople.length} tagged</span>
                )}
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            {/* Add Location */}
            <button
              onClick={() => setShowLocationSearch(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50"
            >
              <span className="text-sm">Add Location</span>
              <div className="flex items-center gap-2">
                {location && <span className="text-xs text-gray-400">{location.name}</span>}
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            {/* Add Music */}
            <button
              onClick={() => setShowMusicSearch(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50"
            >
              <span className="text-sm">Add Music</span>
              <div className="flex items-center gap-2">
                {music && <span className="text-xs text-gray-400">{music.title}</span>}
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            {/* Advanced Settings */}
            <button
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50"
            >
              <span className="text-sm">Advanced Settings</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {showAdvancedSettings && (
              <div className="px-4 py-3 space-y-3 bg-gray-900/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Hide like counts</span>
                  <button
                    onClick={() => setHideLikeCounts(!hideLikeCounts)}
                    className={`w-10 h-5 rounded-full transition-colors ${hideLikeCounts ? 'bg-blue-500' : 'bg-gray-600'}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${hideLikeCounts ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Turn off commenting</span>
                  <button
                    onClick={() => setDisableComments(!disableComments)}
                    className={`w-10 h-5 rounded-full transition-colors ${disableComments ? 'bg-blue-500' : 'bg-gray-600'}`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${disableComments ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
              </div>
            )}

            {/* Share to Stories toggle */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm">Also share to your story</span>
              <button
                onClick={() => setShareToStories(!shareToStories)}
                className={`w-10 h-5 rounded-full transition-colors ${shareToStories ? 'bg-blue-500' : 'bg-gray-600'}`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full transition-transform ${shareToStories ? 'translate-x-5' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location Search Modal */}
      {showLocationSearch && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
            <button onClick={() => setShowLocationSearch(false)} className="text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              placeholder="Search location..."
              className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredLocations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => handleSelectLocation(loc)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 border-b border-gray-800/50"
              >
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                  <span>📍</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{loc.name}</p>
                  <p className="text-xs text-gray-400">{loc.address}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Music Search Modal */}
      {showMusicSearch && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
            <button onClick={() => setShowMusicSearch(false)} className="text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <input
              type="text"
              value={musicQuery}
              onChange={(e) => setMusicQuery(e.target.value)}
              placeholder="Search music..."
              className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredMusic.map((track) => (
              <button
                key={track.id}
                onClick={() => handleSelectMusic(track)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 border-b border-gray-800/50"
              >
                <img src={track.coverUrl} alt="" className="w-12 h-12 rounded object-cover" />
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">{track.title}</p>
                  <p className="text-xs text-gray-400">{track.artist}</p>
                </div>
                <span className="text-xs text-gray-500">{track.duration}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sharing overlay */}
      {sharing && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-medium">Sharing your post...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePostPage;
