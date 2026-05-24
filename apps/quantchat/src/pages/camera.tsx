// ============================================================================
// QuantChat - Camera Page
// Camera with AR filters, snap capture, story/snap mode
// ============================================================================

import React, { useState, useRef } from 'react';
import type { ARFilter } from '../types';
import { apiClient } from '../services/api-client';

type CameraMode = 'snap' | 'story' | 'video';
type CameraFacing = 'user' | 'environment';

export const CameraPage: React.FC = () => {
  const [mode, setMode] = useState<CameraMode>('snap');
  const [facing, setFacing] = useState<CameraFacing>('user');
  const [isRecording, setIsRecording] = useState(false);
  const [capturedMedia, setCapturedMedia] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ARFilter | null>(null);
  const [filters, setFilters] = useState<ARFilter[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [timer, setTimer] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleCapture = () => {
    if (mode === 'video') {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
    } else {
      takePhoto();
    }
  };

  const takePhoto = () => {
    // Simulate photo capture
    const photoUrl = `https://media.quant.chat/captures/photo_${Date.now()}.jpg`;
    setCapturedMedia(photoUrl);
  };

  const startRecording = () => {
    setIsRecording(true);
    setTimer(0);
    recordingTimerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev >= 60) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    const videoUrl = `https://media.quant.chat/captures/video_${Date.now()}.mp4`;
    setCapturedMedia(videoUrl);
  };

  const handleFlipCamera = () => {
    setFacing(facing === 'user' ? 'environment' : 'user');
  };

  const handleSendSnap = async () => {
    if (!capturedMedia) return;
    // Navigate to send screen
    setCapturedMedia(null);
  };

  const handleAddToStory = async () => {
    if (!capturedMedia) return;
    await apiClient.createStory({
      type: mode === 'video' ? 'video' : 'photo',
      mediaUrl: capturedMedia,
      privacy: 'friends',
      filters: selectedFilter ? [selectedFilter.id] : [],
    });
    setCapturedMedia(null);
  };

  const handleDiscard = () => {
    setCapturedMedia(null);
    setTimer(0);
  };

  const loadFilters = async () => {
    const response = await apiClient.getTrendingFilters();
    if (response.success && response.data) {
      setFilters(response.data);
    }
    setShowFilters(true);
  };

  // Captured media preview
  if (capturedMedia) {
    return (
      <div className="camera-preview">
        <div className="preview-media">
          {mode === 'video' ? (
            <video src={capturedMedia} controls autoPlay className="preview-content" />
          ) : (
            <img src={capturedMedia} alt="Captured" className="preview-content" />
          )}
        </div>

        <div className="preview-tools">
          <button className="tool-btn">T</button>
          <button className="tool-btn">✏️</button>
          <button className="tool-btn">😀</button>
          <button className="tool-btn">📎</button>
          <button className="tool-btn">🎵</button>
        </div>

        <div className="preview-actions">
          <button className="discard-btn" onClick={handleDiscard}>✕</button>
          <div className="send-options">
            <button className="story-btn" onClick={handleAddToStory}>
              📖 Story
            </button>
            <button className="send-btn" onClick={handleSendSnap}>
              ➤ Send
            </button>
          </div>
        </div>

        {timer > 0 && (
          <div className="duration-badge">{timer}s</div>
        )}
      </div>
    );
  }

  return (
    <div className="camera-page">
      {/* Camera viewfinder */}
      <div className="camera-viewfinder">
        <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />

        {selectedFilter && (
          <div className="filter-overlay">
            <span className="filter-name">{selectedFilter.name}</span>
          </div>
        )}

        {isRecording && (
          <div className="recording-indicator">
            <span className="rec-dot" />
            <span className="rec-time">{timer}s</span>
          </div>
        )}
      </div>

      {/* Top controls */}
      <div className="camera-top-controls">
        <button className="control-btn" onClick={() => window.location.hash = '/'}>✕</button>
        <button className="control-btn" onClick={() => setFlashEnabled(!flashEnabled)}>
          {flashEnabled ? '⚡' : '⚡'}
        </button>
        <button className="control-btn" onClick={handleFlipCamera}>🔄</button>
      </div>

      {/* Mode selector */}
      <div className="camera-mode-selector">
        <button className={mode === 'snap' ? 'active' : ''} onClick={() => setMode('snap')}>SNAP</button>
        <button className={mode === 'video' ? 'active' : ''} onClick={() => setMode('video')}>VIDEO</button>
        <button className={mode === 'story' ? 'active' : ''} onClick={() => setMode('story')}>STORY</button>
      </div>

      {/* Capture button */}
      <div className="camera-controls">
        <button className="memories-btn" onClick={() => window.location.hash = '/memories'}>
          🖼️
        </button>
        <button
          className={`capture-btn ${mode === 'video' ? 'video-mode' : ''} ${isRecording ? 'recording' : ''}`}
          onClick={handleCapture}
        >
          <div className="capture-inner" />
        </button>
        <button className="filters-btn" onClick={loadFilters}>
          😊
        </button>
      </div>

      {/* Filters carousel */}
      {showFilters && (
        <div className="filters-carousel">
          <div className="filters-header">
            <h3>Filters</h3>
            <button onClick={() => setShowFilters(false)}>✕</button>
          </div>
          <div className="filters-list">
            <button
              className={`filter-item ${!selectedFilter ? 'selected' : ''}`}
              onClick={() => setSelectedFilter(null)}
            >
              <span>None</span>
            </button>
            {filters.map(filter => (
              <button
                key={filter.id}
                className={`filter-item ${selectedFilter?.id === filter.id ? 'selected' : ''}`}
                onClick={() => setSelectedFilter(filter)}
              >
                <img src={filter.thumbnailUrl} alt={filter.name} />
                <span>{filter.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraPage;
