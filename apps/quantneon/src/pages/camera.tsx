// ============================================================================
// QuantNeon - Camera UI Page
// Viewfinder, capture, modes, filters, flash, timer, beauty
// ============================================================================

import React, { useState, useCallback } from 'react';
import { LoadingState, ErrorState } from '@quant/shared-ui';
import { useARFilters } from '../hooks/useARFilters';

type CameraMode = 'Photo' | 'Video' | 'Boomerang' | 'Layout' | 'Hands-Free';
type FlashMode = 'off' | 'on' | 'auto';
type CameraFacing = 'front' | 'back';

const CameraPage: React.FC = () => {
  const { data: filters, isLoading, error, refetch } = useARFilters();
  const [currentMode, setCurrentMode] = useState<CameraMode>('Photo');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [facing, setFacing] = useState<CameraFacing>('back');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const modes: CameraMode[] = ['Photo', 'Video', 'Boomerang', 'Layout', 'Hands-Free'];

  const handleCapture = useCallback(() => {
    if (currentMode === 'Video' || currentMode === 'Hands-Free') {
      setIsRecording(!isRecording);
    } else {
      // Photo capture would happen here
    }
  }, [currentMode, isRecording]);

  return (
    <div className="camera-page">
      {/* Viewfinder */}
      <div className="viewfinder">
        <div className="camera-preview-area">
          <div className="camera-placeholder">
            <span>{facing === 'front' ? '🤳' : '📷'}</span>
          </div>
          {selectedFilter && (
            <div className="active-filter-overlay">
              <span>Filter: {selectedFilter}</span>
            </div>
          )}
        </div>

        {/* Top controls */}
        <div className="camera-top-controls">
          <button
            className="flash-btn"
            onClick={() => setFlash((f) => (f === 'off' ? 'on' : f === 'on' ? 'auto' : 'off'))}
          >
            {flash === 'off' ? '⚡' : flash === 'on' ? '⚡' : '⚡A'}
          </button>
          <button
            className="flip-btn"
            onClick={() => setFacing((f) => (f === 'front' ? 'back' : 'front'))}
          >
            🔄
          </button>
        </div>

        {isRecording && (
          <div className="recording-indicator">
            <span className="rec-dot" /> REC
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-strip">
        {isLoading && <LoadingState variant="dots" text="" size="sm" />}
        {error && <span className="filter-error">Could not load filters</span>}
        {!isLoading &&
          !error &&
          (filters || []).map((filter: { id: string; name: string }) => (
            <button
              key={filter.id}
              className={`filter-item ${selectedFilter === filter.id ? 'active' : ''}`}
              onClick={() => setSelectedFilter(selectedFilter === filter.id ? null : filter.id)}
            >
              <span className="filter-name">{filter.name}</span>
            </button>
          ))}
      </div>

      {/* Mode selector */}
      <div className="mode-selector">
        {modes.map((mode) => (
          <button
            key={mode}
            className={`mode-btn ${currentMode === mode ? 'active' : ''}`}
            onClick={() => setCurrentMode(mode)}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Capture button */}
      <div className="capture-controls">
        <button
          className={`capture-btn ${isRecording ? 'recording' : ''} ${currentMode === 'Video' ? 'video-mode' : ''}`}
          onClick={handleCapture}
        >
          <div className="capture-inner" />
        </button>
      </div>
    </div>
  );
};

export default CameraPage;
