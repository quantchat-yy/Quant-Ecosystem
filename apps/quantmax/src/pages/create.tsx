// FIXME(phase-23): replace mock with real API
// ============================================================================
// QuantMax - Video Creation Studio
// Camera view, effects/filters gallery, speed controls, timer countdown,
// gallery picker, trim/split editor, text overlay, sound selector, duet/stitch
// ============================================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface VideoEffect {
  id: string;
  name: string;
  category: 'filter' | 'effect' | 'beauty' | 'ar';
  thumbnailUrl: string;
  intensity: number;
}

interface SoundItem {
  id: string;
  name: string;
  artistName: string;
  duration: number;
  coverUrl: string;
  isBookmarked: boolean;
  usageCount: number;
}

interface TextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor: string;
  position: { x: number; y: number };
  startTime: number;
  endTime: number;
  animation: 'none' | 'fade' | 'slide' | 'bounce' | 'typewriter';
}

interface TrimPoint {
  start: number;
  end: number;
}

type RecordingMode = 'normal' | 'duet' | 'stitch' | 'greenscreen';
type SpeedOption = 0.5 | 1 | 1.5 | 2 | 3;
type TimerOption = 0 | 3 | 10;
type DurationOption = 15 | 60 | 180;

const SPEED_OPTIONS: SpeedOption[] = [0.5, 1, 1.5, 2, 3];
const TIMER_OPTIONS: TimerOption[] = [0, 3, 10];
const DURATION_OPTIONS: DurationOption[] = [15, 60, 180];
const FONT_OPTIONS = ['Sans-Serif', 'Serif', 'Monospace', 'Handwriting', 'Display'];
const COLOR_OPTIONS = [
  '#ffffff',
  '#000000',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ff00ff',
  '#00ffff',
  '#ff6600',
  '#9900ff',
];

const CreateVideoPage: React.FC = () => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [maxDuration, setMaxDuration] = useState<DurationOption>(60);
  const [speed, setSpeed] = useState<SpeedOption>(1);
  const [timer, setTimer] = useState<TimerOption>(0);
  const [timerCountdown, setTimerCountdown] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const [mode, setMode] = useState<RecordingMode>('normal');
  const [isFrontCamera, setIsFrontCamera] = useState<boolean>(true);
  const [flashOn, setFlashOn] = useState<boolean>(false);

  const [effects, setEffects] = useState<VideoEffect[]>([]);
  const [selectedEffect, setSelectedEffect] = useState<string | null>(null);
  const [showEffectsGallery, setShowEffectsGallery] = useState<boolean>(false);
  const [effectCategory, setEffectCategory] = useState<'filter' | 'effect' | 'beauty' | 'ar'>(
    'filter',
  );

  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [selectedSound, setSelectedSound] = useState<SoundItem | null>(null);
  const [showSoundSelector, setShowSoundSelector] = useState<boolean>(false);
  const [soundSearch, setSoundSearch] = useState<string>('');

  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [showTextEditor, setShowTextEditor] = useState<boolean>(false);
  const [editingText, setEditingText] = useState<TextOverlay | null>(null);
  const [newTextValue, setNewTextValue] = useState<string>('');
  const [selectedFont, setSelectedFont] = useState<string>('Sans-Serif');
  const [selectedColor, setSelectedColor] = useState<string>('#ffffff');
  const [selectedFontSize, setSelectedFontSize] = useState<number>(24);

  const [showTrimEditor, setShowTrimEditor] = useState<boolean>(false);
  const [trimPoints, setTrimPoints] = useState<TrimPoint>({ start: 0, end: 100 });
  const [showSpeedControl, setShowSpeedControl] = useState<boolean>(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState<boolean>(false);
  const [galleryItems, setGalleryItems] = useState<string[]>([]);
  const [hasRecordedClip, setHasRecordedClip] = useState<boolean>(false);

  const [showModeSelector, setShowModeSelector] = useState<boolean>(false);
  const [duetVideoUrl, setDuetVideoUrl] = useState<string>('');

  const recordingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadEffects();
    loadSounds();
    loadGallery();
  }, []);

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 0.1;
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newDuration;
        });
      }, 100);
    }
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
    };
  }, [isRecording, maxDuration]);

  const loadEffects = useCallback(async () => {
    const categories: Array<'filter' | 'effect' | 'beauty' | 'ar'> = [
      'filter',
      'effect',
      'beauty',
      'ar',
    ];
    const mockEffects: VideoEffect[] = categories.flatMap((cat, ci) =>
      Array.from({ length: 8 }, (_, i) => ({
        id: `${cat}-${i}`,
        name: `${cat.charAt(0).toUpperCase() + cat.slice(1)} ${i + 1}`,
        category: cat,
        thumbnailUrl: `https://cdn.quantmax.app/effects/${cat}/${i}.jpg`,
        intensity: 0.8,
      })),
    );
    setEffects(mockEffects);
  }, []);

  const loadSounds = useCallback(async () => {
    const mockSounds: SoundItem[] = Array.from({ length: 30 }, (_, i) => ({
      id: `sound-${i}`,
      name: `Trending Sound ${i + 1}`,
      artistName: `Artist ${i + 1}`,
      duration: 15 + Math.floor(Math.random() * 45),
      coverUrl: `https://cdn.quantmax.app/sounds/${i}.jpg`,
      isBookmarked: i % 5 === 0,
      usageCount: Math.floor(Math.random() * 100000),
    }));
    setSounds(mockSounds);
  }, []);

  const loadGallery = useCallback(async () => {
    const items = Array.from({ length: 20 }, (_, i) => `https://cdn.quantmax.app/gallery/${i}.jpg`);
    setGalleryItems(items);
  }, []);

  const startRecording = useCallback(() => {
    if (timer > 0) {
      setIsTimerActive(true);
      setTimerCountdown(timer);
      timerInterval.current = setInterval(() => {
        setTimerCountdown((prev) => {
          if (prev <= 1) {
            if (timerInterval.current) clearInterval(timerInterval.current);
            setIsTimerActive(false);
            setIsRecording(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setIsRecording(true);
    }
  }, [timer]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setHasRecordedClip(true);
    if (recordingInterval.current) clearInterval(recordingInterval.current);
  }, []);

  const handleSelectEffect = useCallback((effectId: string) => {
    setSelectedEffect((prev) => (prev === effectId ? null : effectId));
  }, []);

  const handleSelectSound = useCallback((sound: SoundItem) => {
    setSelectedSound(sound);
    setShowSoundSelector(false);
  }, []);

  const handleAddTextOverlay = useCallback(() => {
    if (!newTextValue.trim()) return;
    const newOverlay: TextOverlay = {
      id: `text-${Date.now()}`,
      text: newTextValue,
      fontFamily: selectedFont,
      fontSize: selectedFontSize,
      color: selectedColor,
      backgroundColor: 'transparent',
      position: { x: 50, y: 50 },
      startTime: 0,
      endTime: recordingDuration || maxDuration,
      animation: 'none',
    };
    setTextOverlays((prev) => [...prev, newOverlay]);
    setNewTextValue('');
    setShowTextEditor(false);
  }, [newTextValue, selectedFont, selectedFontSize, selectedColor, recordingDuration, maxDuration]);

  const handleRemoveTextOverlay = useCallback((id: string) => {
    setTextOverlays((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleFlipCamera = useCallback(() => {
    setIsFrontCamera((prev) => !prev);
  }, []);

  const handleTrimChange = useCallback((type: 'start' | 'end', value: number) => {
    setTrimPoints((prev) => ({ ...prev, [type]: value }));
  }, []);

  const filteredSounds = useMemo(() => {
    if (!soundSearch.trim()) return sounds;
    return sounds.filter(
      (s) =>
        s.name.toLowerCase().includes(soundSearch.toLowerCase()) ||
        s.artistName.toLowerCase().includes(soundSearch.toLowerCase()),
    );
  }, [sounds, soundSearch]);

  const filteredEffects = useMemo(() => {
    return effects.filter((e) => e.category === effectCategory);
  }, [effects, effectCategory]);

  const progressPercent = useMemo(() => {
    return (recordingDuration / maxDuration) * 100;
  }, [recordingDuration, maxDuration]);

  return (
    <div className="create-page">
      {/* Camera View */}
      <div className="camera-view-area">
        <div className="camera-feed">
          {mode === 'duet' && duetVideoUrl && (
            <div className="duet-split">
              <video className="duet-original" src={duetVideoUrl} autoPlay muted loop />
            </div>
          )}
          <div className={`camera-preview ${mode === 'duet' ? 'duet-self' : ''}`}>
            <div className="camera-placeholder">
              <span className="camera-icon">{isFrontCamera ? '🤳' : '📷'}</span>
            </div>
          </div>

          {/* Effect overlay visualization */}
          {selectedEffect && (
            <div className="effect-active-overlay">
              <span className="effect-name">
                {effects.find((e) => e.id === selectedEffect)?.name}
              </span>
            </div>
          )}

          {/* Text overlays on preview */}
          {textOverlays.map((overlay) => (
            <div
              key={overlay.id}
              className="text-overlay-preview"
              style={{
                left: `${overlay.position.x}%`,
                top: `${overlay.position.y}%`,
                fontFamily: overlay.fontFamily,
                fontSize: `${overlay.fontSize}px`,
                color: overlay.color,
              }}
            >
              {overlay.text}
              <button
                className="remove-overlay-btn"
                onClick={() => handleRemoveTextOverlay(overlay.id)}
              >
                x
              </button>
            </div>
          ))}
        </div>

        {/* Timer Countdown Overlay */}
        {isTimerActive && (
          <div className="timer-countdown-overlay">
            <span className="countdown-number">{timerCountdown}</span>
          </div>
        )}

        {/* Recording Progress Bar */}
        <div className="recording-progress">
          <div className="progress-track">
            <div className="progress-filled" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="duration-label">
            {recordingDuration.toFixed(1)}s / {maxDuration}s
          </span>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="recording-indicator">
            <span className="rec-dot" />
            <span className="rec-text">REC</span>
          </div>
        )}
      </div>

      {/* Right Side Controls */}
      <div className="side-controls">
        <button className="side-control-btn" onClick={handleFlipCamera}>
          <span className="control-icon">🔄</span>
          <span className="control-label">Flip</span>
        </button>
        <button className="side-control-btn" onClick={() => setShowSpeedControl(!showSpeedControl)}>
          <span className="control-icon">⚡</span>
          <span className="control-label">{speed}x</span>
        </button>
        <button
          className="side-control-btn"
          onClick={() => setShowEffectsGallery(!showEffectsGallery)}
        >
          <span className="control-icon">✨</span>
          <span className="control-label">Effects</span>
        </button>
        <button className="side-control-btn" onClick={() => setFlashOn(!flashOn)}>
          <span className="control-icon">{flashOn ? '⚡' : '💡'}</span>
          <span className="control-label">Flash</span>
        </button>
        <button
          className="side-control-btn"
          onClick={() =>
            setTimer(
              (prev) => TIMER_OPTIONS[(TIMER_OPTIONS.indexOf(prev) + 1) % TIMER_OPTIONS.length],
            )
          }
        >
          <span className="control-icon">⏱️</span>
          <span className="control-label">{timer > 0 ? `${timer}s` : 'Off'}</span>
        </button>
        <button className="side-control-btn" onClick={() => setShowTextEditor(true)}>
          <span className="control-icon">Aa</span>
          <span className="control-label">Text</span>
        </button>
        <button className="side-control-btn" onClick={() => setShowModeSelector(true)}>
          <span className="control-icon">🎭</span>
          <span className="control-label">Mode</span>
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="bottom-controls">
        {/* Duration Options */}
        <div className="duration-options">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              className={`duration-btn ${maxDuration === d ? 'active' : ''}`}
              onClick={() => setMaxDuration(d)}
            >
              {d}s
            </button>
          ))}
        </div>

        {/* Main Action Row */}
        <div className="main-actions-row">
          <button className="gallery-btn" onClick={() => setShowGalleryPicker(true)}>
            <span className="gallery-thumb">🖼️</span>
            <span className="gallery-label">Gallery</span>
          </button>

          <button
            className={`record-button ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            <div className={`record-inner ${isRecording ? 'recording' : ''}`} />
          </button>

          <button className="sound-btn" onClick={() => setShowSoundSelector(true)}>
            <span className="sound-icon">🎵</span>
            <span className="sound-label">{selectedSound ? selectedSound.name : 'Sounds'}</span>
          </button>
        </div>

        {/* Post-recording actions */}
        {hasRecordedClip && (
          <div className="post-record-actions">
            <button className="trim-btn" onClick={() => setShowTrimEditor(true)}>
              Trim
            </button>
            <button className="next-btn">Next &rarr;</button>
          </div>
        )}
      </div>

      {/* Speed Control Panel */}
      {showSpeedControl && (
        <div className="speed-control-panel">
          <h4 className="speed-title">Recording Speed</h4>
          <div className="speed-options">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => {
                  setSpeed(s);
                  setShowSpeedControl(false);
                }}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Effects Gallery Overlay */}
      {showEffectsGallery && (
        <div className="effects-gallery-overlay">
          <div className="effects-gallery">
            <div className="effects-header">
              <h3>Effects</h3>
              <button className="close-btn" onClick={() => setShowEffectsGallery(false)}>
                &#10005;
              </button>
            </div>
            <div className="effects-categories">
              {(['filter', 'effect', 'beauty', 'ar'] as const).map((cat) => (
                <button
                  key={cat}
                  className={`category-tab ${effectCategory === cat ? 'active' : ''}`}
                  onClick={() => setEffectCategory(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
            <div className="effects-grid">
              {filteredEffects.map((effect) => (
                <button
                  key={effect.id}
                  className={`effect-item ${selectedEffect === effect.id ? 'selected' : ''}`}
                  onClick={() => handleSelectEffect(effect.id)}
                >
                  <img className="effect-thumb" src={effect.thumbnailUrl} alt={effect.name} />
                  <span className="effect-name">{effect.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sound Selector */}
      {showSoundSelector && (
        <div className="sound-selector-overlay">
          <div className="sound-selector">
            <div className="sound-header">
              <h3>Sounds</h3>
              <button className="close-btn" onClick={() => setShowSoundSelector(false)}>
                &#10005;
              </button>
            </div>
            <div className="sound-search">
              <input
                className="sound-search-input"
                placeholder="Search sounds..."
                value={soundSearch}
                onChange={(e) => setSoundSearch(e.target.value)}
              />
            </div>
            <div className="sound-list">
              {filteredSounds.map((sound) => (
                <div
                  key={sound.id}
                  className={`sound-item ${selectedSound?.id === sound.id ? 'selected' : ''}`}
                  onClick={() => handleSelectSound(sound)}
                >
                  <img className="sound-cover" src={sound.coverUrl} alt={sound.name} />
                  <div className="sound-info">
                    <span className="sound-title">{sound.name}</span>
                    <span className="sound-artist">{sound.artistName}</span>
                    <span className="sound-usage">{sound.usageCount.toLocaleString()} videos</span>
                  </div>
                  <span className="sound-duration">{sound.duration}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Text Overlay Editor */}
      {showTextEditor && (
        <div className="text-editor-overlay">
          <div className="text-editor">
            <div className="text-editor-header">
              <h3>Add Text</h3>
              <button className="close-btn" onClick={() => setShowTextEditor(false)}>
                &#10005;
              </button>
            </div>
            <input
              className="text-input"
              placeholder="Type your text..."
              value={newTextValue}
              onChange={(e) => setNewTextValue(e.target.value)}
              autoFocus
            />
            <div className="font-selector">
              <h4>Font</h4>
              <div className="font-options">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font}
                    className={`font-btn ${selectedFont === font ? 'active' : ''}`}
                    onClick={() => setSelectedFont(font)}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>
            <div className="color-selector">
              <h4>Color</h4>
              <div className="color-options">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${selectedColor === color ? 'active' : ''}`}
                    onClick={() => setSelectedColor(color)}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="font-size-control">
              <h4>Size: {selectedFontSize}px</h4>
              <input
                type="range"
                min="12"
                max="72"
                value={selectedFontSize}
                onChange={(e) => setSelectedFontSize(Number(e.target.value))}
                className="size-slider"
              />
            </div>
            <button
              className="add-text-btn"
              onClick={handleAddTextOverlay}
              disabled={!newTextValue.trim()}
            >
              Add Text
            </button>
          </div>
        </div>
      )}

      {/* Trim/Split Editor */}
      {showTrimEditor && (
        <div className="trim-editor-overlay">
          <div className="trim-editor">
            <div className="trim-header">
              <h3>Trim Video</h3>
              <button className="close-btn" onClick={() => setShowTrimEditor(false)}>
                &#10005;
              </button>
            </div>
            <div className="trim-timeline">
              <div className="trim-track">
                <div
                  className="trim-selection"
                  style={{
                    left: `${trimPoints.start}%`,
                    width: `${trimPoints.end - trimPoints.start}%`,
                  }}
                />
                <input
                  type="range"
                  className="trim-start-handle"
                  min="0"
                  max="100"
                  value={trimPoints.start}
                  onChange={(e) => handleTrimChange('start', Number(e.target.value))}
                />
                <input
                  type="range"
                  className="trim-end-handle"
                  min="0"
                  max="100"
                  value={trimPoints.end}
                  onChange={(e) => handleTrimChange('end', Number(e.target.value))}
                />
              </div>
            </div>
            <div className="trim-actions">
              <button className="split-btn">Split</button>
              <button className="apply-trim-btn" onClick={() => setShowTrimEditor(false)}>
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Picker */}
      {showGalleryPicker && (
        <div className="gallery-picker-overlay">
          <div className="gallery-picker">
            <div className="gallery-header">
              <h3>Gallery</h3>
              <button className="close-btn" onClick={() => setShowGalleryPicker(false)}>
                &#10005;
              </button>
            </div>
            <div className="gallery-grid">
              {galleryItems.map((item, idx) => (
                <div key={idx} className="gallery-item">
                  <img className="gallery-thumb" src={item} alt={`Gallery ${idx}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector */}
      {showModeSelector && (
        <div className="mode-selector-overlay" onClick={() => setShowModeSelector(false)}>
          <div className="mode-selector" onClick={(e) => e.stopPropagation()}>
            <h3>Recording Mode</h3>
            <div className="mode-options">
              {(['normal', 'duet', 'stitch', 'greenscreen'] as RecordingMode[]).map((m) => (
                <button
                  key={m}
                  className={`mode-btn ${mode === m ? 'active' : ''}`}
                  onClick={() => {
                    setMode(m);
                    setShowModeSelector(false);
                  }}
                >
                  <span className="mode-icon">
                    {m === 'normal' ? '🎬' : m === 'duet' ? '👥' : m === 'stitch' ? '🧵' : '🟢'}
                  </span>
                  <span className="mode-name">{m.charAt(0).toUpperCase() + m.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateVideoPage;
