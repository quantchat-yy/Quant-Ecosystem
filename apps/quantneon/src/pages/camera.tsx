// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantNeon - Camera UI Page
// Viewfinder, capture, modes, filters, flash, timer, beauty
// ============================================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CameraMode = 'Photo' | 'Video' | 'Boomerang' | 'Layout' | 'Hands-Free';
type FlashMode = 'off' | 'on' | 'auto';
type CameraFacing = 'front' | 'back';

interface CameraFilter {
  id: string;
  name: string;
  previewColor: string;
}

interface GalleryPhoto {
  id: string;
  thumbnailUrl: string;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const CAMERA_MODES: CameraMode[] = ['Photo', 'Video', 'Boomerang', 'Layout', 'Hands-Free'];

const CAMERA_FILTERS: CameraFilter[] = [
  { id: 'f0', name: 'Normal', previewColor: 'transparent' },
  { id: 'f1', name: 'Clarendon', previewColor: '#3498db30' },
  { id: 'f2', name: 'Gingham', previewColor: '#f1c40f30' },
  { id: 'f3', name: 'Moon', previewColor: '#2c3e5050' },
  { id: 'f4', name: 'Lark', previewColor: '#e74c3c20' },
  { id: 'f5', name: 'Reyes', previewColor: '#f39c1230' },
  { id: 'f6', name: 'Juno', previewColor: '#9b59b630' },
  { id: 'f7', name: 'Slumber', previewColor: '#1abc9c30' },
  { id: 'f8', name: 'Crema', previewColor: '#e67e2230' },
  { id: 'f9', name: 'Ludwig', previewColor: '#8e44ad20' },
  { id: 'f10', name: 'Aden', previewColor: '#27ae6030' },
  { id: 'f11', name: 'Perpetua', previewColor: '#2980b930' },
];

const TIMER_OPTIONS = [0, 3, 10];

const RECENT_GALLERY: GalleryPhoto[] = [
  { id: 'g1', thumbnailUrl: 'https://picsum.photos/seed/gal1/100/100' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CameraPage: React.FC = () => {
  const [mode, setMode] = useState<CameraMode>('Photo');
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [facing, setFacing] = useState<CameraFacing>('back');
  const [selectedFilter, setSelectedFilter] = useState<CameraFilter>(CAMERA_FILTERS[0]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [timerOption, setTimerOption] = useState<number>(0);
  const [beautyMode, setBeautyMode] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showTimerOptions, setShowTimerOptions] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [captureAnimation, setCaptureAnimation] = useState<boolean>(false);

  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate camera initialization
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        setError(null);
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (err) {
        setError('Failed to access camera.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [isRecording]);

  // Countdown timer
  useEffect(() => {
    if (timerActive && timerSeconds > 0) {
      timerIntervalRef.current = setTimeout(() => {
        setTimerSeconds((prev) => prev - 1);
      }, 1000);
    } else if (timerActive && timerSeconds === 0) {
      setTimerActive(false);
      handleCapture();
    }
    return () => {
      if (timerIntervalRef.current) clearTimeout(timerIntervalRef.current);
    };
  }, [timerActive, timerSeconds]);

  // Mode change
  const handleModeChange = useCallback(
    (newMode: CameraMode) => {
      setMode(newMode);
      if (isRecording) {
        setIsRecording(false);
      }
    },
    [isRecording],
  );

  // Flash cycle
  const handleFlashCycle = useCallback(() => {
    setFlashMode((prev) => {
      if (prev === 'off') return 'on';
      if (prev === 'on') return 'auto';
      return 'off';
    });
  }, []);

  // Flip camera
  const handleFlipCamera = useCallback(() => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  }, []);

  // Capture/Record
  const handleCapture = useCallback(() => {
    if (mode === 'Video' || mode === 'Hands-Free') {
      setIsRecording((prev) => !prev);
    } else {
      setCaptureAnimation(true);
      setTimeout(() => setCaptureAnimation(false), 200);
    }
  }, [mode]);

  // Timer-based capture
  const handleTimerCapture = useCallback(() => {
    if (timerOption > 0) {
      setTimerSeconds(timerOption);
      setTimerActive(true);
    } else {
      handleCapture();
    }
  }, [timerOption, handleCapture]);

  // Filter selection
  const handleFilterSelect = useCallback((filter: CameraFilter) => {
    setSelectedFilter(filter);
  }, []);

  // Timer option change
  const handleTimerOption = useCallback((seconds: number) => {
    setTimerOption(seconds);
    setShowTimerOptions(false);
  }, []);

  // Beauty mode toggle
  const handleBeautyToggle = useCallback(() => {
    setBeautyMode((prev) => !prev);
  }, []);

  // Zoom
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoomLevel((prev) => {
      if (direction === 'in') return Math.min(prev + 0.5, 5);
      return Math.max(prev - 0.5, 1);
    });
  }, []);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Initializing camera...</p>
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
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
            </svg>
          </div>
          <p className="text-white text-center">{error}</p>
          <p className="text-gray-400 text-sm text-center">
            Please allow camera access in your settings.
          </p>
          <button
            onClick={() => {
              setError(null);
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
    <div className="relative h-screen bg-black overflow-hidden flex flex-col">
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 z-30 px-4 py-3 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={() => window.history.back()}
          className="p-2 text-white hover:bg-white/20 rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          {/* Flash */}
          <button
            onClick={handleFlashCycle}
            className="p-2 text-white hover:bg-white/20 rounded-full"
          >
            {flashMode === 'off' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              </svg>
            )}
            {flashMode === 'on' && (
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {flashMode === 'auto' && (
              <div className="relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="absolute -bottom-1 -right-1 text-[8px] font-bold text-yellow-400">
                  A
                </span>
              </div>
            )}
          </button>

          {/* Settings / Grid */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`p-2 rounded-full ${showGrid ? 'text-yellow-400 bg-white/20' : 'text-white hover:bg-white/20'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 10h16M4 14h16M4 18h16"
              />
            </svg>
          </button>

          {/* Timer */}
          <div className="relative">
            <button
              onClick={() => setShowTimerOptions(!showTimerOptions)}
              className={`p-2 rounded-full ${timerOption > 0 ? 'text-yellow-400 bg-white/20' : 'text-white hover:bg-white/20'}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {timerOption > 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 text-[9px] font-bold text-yellow-400">
                  {timerOption}s
                </span>
              )}
            </button>
            {showTimerOptions && (
              <div className="absolute top-full right-0 mt-2 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden shadow-xl">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleTimerOption(opt)}
                    className={`w-full px-4 py-2 text-sm text-left hover:bg-gray-800 ${timerOption === opt ? 'text-yellow-400' : 'text-white'}`}
                  >
                    {opt === 0 ? 'Off' : `${opt}s`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Flip camera */}
          <button
            onClick={handleFlipCamera}
            className="p-2 text-white hover:bg-white/20 rounded-full"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white text-sm font-mono">{formatDuration(recordingDuration)}</span>
        </div>
      )}

      {/* Timer countdown */}
      {timerActive && timerSeconds > 0 && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/30">
          <span className="text-white text-8xl font-bold animate-ping">{timerSeconds}</span>
        </div>
      )}

      {/* Viewfinder */}
      <div className="flex-1 relative">
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          {/* Camera feed placeholder */}
          <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900 relative">
            {/* Filter overlay */}
            {selectedFilter.id !== 'f0' && (
              <div
                className="absolute inset-0"
                style={{ backgroundColor: selectedFilter.previewColor }}
              />
            )}

            {/* Grid overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/20" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
              </div>
            )}

            {/* Center camera icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-16 h-16 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>

            {/* Zoom level */}
            {zoomLevel > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 rounded-full px-3 py-1">
                <span className="text-white text-xs font-medium">{zoomLevel}x</span>
              </div>
            )}

            {/* Capture flash */}
            {captureAnimation && <div className="absolute inset-0 bg-white animate-pulse z-20" />}
          </div>
        </div>

        {/* Beauty mode indicator */}
        {beautyMode && (
          <div className="absolute top-4 left-4 bg-pink-500/80 rounded-full px-2 py-0.5">
            <span className="text-white text-xs font-medium">Beauty</span>
          </div>
        )}

        {/* Facing indicator */}
        <div className="absolute top-4 right-4 bg-black/40 rounded-full px-2 py-0.5">
          <span className="text-white text-xs">{facing === 'front' ? 'Front' : 'Rear'}</span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bg-black px-4 pt-4 pb-6">
        {/* Filter Strip */}
        <div className="mb-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {CAMERA_FILTERS.map((filter) => (
              <button
                key={filter.id}
                onClick={() => handleFilterSelect(filter)}
                className={`flex flex-col items-center gap-1 flex-shrink-0 transition-all ${
                  selectedFilter.id === filter.id ? 'scale-110' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full border-2 ${
                    selectedFilter.id === filter.id ? 'border-white' : 'border-gray-600'
                  }`}
                  style={{ backgroundColor: filter.previewColor || '#333' }}
                />
                <span
                  className={`text-[10px] ${
                    selectedFilter.id === filter.id ? 'text-white font-medium' : 'text-gray-400'
                  }`}
                >
                  {filter.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Capture Row */}
        <div className="flex items-center justify-between">
          {/* Gallery shortcut */}
          <button className="w-10 h-10 rounded-lg overflow-hidden border border-gray-600">
            {RECENT_GALLERY.length > 0 ? (
              <img
                src={RECENT_GALLERY[0].thumbnailUrl}
                alt="Gallery"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
          </button>

          {/* Capture Button */}
          <button
            onClick={handleTimerCapture}
            className={`w-20 h-20 rounded-full border-4 ${
              isRecording ? 'border-red-500' : 'border-white'
            } flex items-center justify-center transition-all hover:scale-105`}
          >
            <div
              className={`transition-all ${
                isRecording
                  ? 'w-8 h-8 bg-red-500 rounded-md'
                  : mode === 'Video' || mode === 'Hands-Free'
                    ? 'w-14 h-14 bg-red-500 rounded-full'
                    : 'w-14 h-14 bg-white rounded-full'
              }`}
            />
          </button>

          {/* Beauty Mode */}
          <button
            onClick={handleBeautyToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              beautyMode ? 'bg-pink-500' : 'bg-gray-800 border border-gray-600'
            }`}
          >
            <svg
              className={`w-5 h-5 ${beautyMode ? 'text-white' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex justify-center gap-6 mt-4">
          {CAMERA_MODES.map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`text-xs font-medium transition-all ${
                mode === m ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CameraPage;
