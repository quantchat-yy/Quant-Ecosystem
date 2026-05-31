'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Select } from '@quant/shared-ui';
import { spring } from '@quant/brand';

interface PreJoinLobbyProps {
  onJoin: (displayName: string) => void;
  meetingTitle?: string;
}

interface DeviceOption {
  value: string;
  label: string;
}

interface VirtualBackground {
  id: string;
  label: string;
  thumbnail: string;
}

const VIRTUAL_BACKGROUNDS: VirtualBackground[] = [
  { id: 'none', label: 'None', thumbnail: '' },
  { id: 'blur', label: 'Blur', thumbnail: '' },
  { id: 'office', label: 'Office', thumbnail: '' },
  { id: 'beach', label: 'Beach', thumbnail: '' },
  { id: 'space', label: 'Space', thumbnail: '' },
];

export function PreJoinLobby({ onJoin, meetingTitle }: PreJoinLobbyProps) {
  const [displayName, setDisplayName] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [cameras, setCameras] = useState<DeviceOption[]>([]);
  const [mics, setMics] = useState<DeviceOption[]>([]);
  const [speakers, setSpeakers] = useState<DeviceOption[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [audioLevel, setAudioLevel] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    async function enumerateDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();

        const videoInputs = devices
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({ value: d.deviceId, label: d.label || 'Camera' }));
        const audioInputs = devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({ value: d.deviceId, label: d.label || 'Microphone' }));
        const audioOutputs = devices
          .filter((d) => d.kind === 'audiooutput')
          .map((d) => ({ value: d.deviceId, label: d.label || 'Speaker' }));

        setCameras(videoInputs.length > 0 ? videoInputs : [{ value: 'none', label: 'No Camera' }]);
        setMics(audioInputs.length > 0 ? audioInputs : [{ value: 'none', label: 'No Microphone' }]);
        setSpeakers(
          audioOutputs.length > 0 ? audioOutputs : [{ value: 'default', label: 'Default Speaker' }],
        );

        if (videoInputs.length > 0) setSelectedCamera(videoInputs[0].value);
        if (audioInputs.length > 0) setSelectedMic(audioInputs[0].value);
        if (audioOutputs.length > 0) setSelectedSpeaker(audioOutputs[0].value);
      } catch {
        setCameras([{ value: 'none', label: 'No Camera' }]);
        setMics([{ value: 'none', label: 'No Microphone' }]);
        setSpeakers([{ value: 'default', label: 'Default Speaker' }]);
      }
    }

    enumerateDevices();
  }, []);

  useEffect(() => {
    if (!videoEnabled || !selectedCamera || selectedCamera === 'none') {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
        setPreviewStream(null);
      }
      return;
    }

    let cancelled = false;

    async function startPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedCamera ? { exact: selectedCamera } : undefined },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        setPreviewStream(stream);
      } catch {
        // Device not available
      }
    }

    startPreview();

    return () => {
      cancelled = true;
    };
  }, [videoEnabled, selectedCamera]);

  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Audio level meter
  useEffect(() => {
    if (!audioEnabled || !selectedMic || selectedMic === 'none') {
      setAudioLevel(0);
      return;
    }

    let cancelled = false;

    async function startAudioAnalysis() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { deviceId: selectedMic ? { exact: selectedMic } : undefined },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
          if (cancelled) return;
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
          setAudioLevel(avg / 255);
          animFrameRef.current = requestAnimationFrame(tick);
        }

        tick();
      } catch {
        // Audio not available
      }
    }

    startAudioAnalysis();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioEnabled, selectedMic]);

  useEffect(() => {
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleJoin = () => {
    if (displayName.trim()) {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
      cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      onJoin(displayName.trim());
    }
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen p-4 md:p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', ...spring.gentle }}
    >
      <div className="w-full max-w-lg space-y-6">
        {meetingTitle && (
          <motion.h1
            className="text-2xl font-bold text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {meetingTitle}
          </motion.h1>
        )}

        {/* Camera Preview */}
        <motion.div
          className="relative w-full aspect-video rounded-xl bg-gray-900 flex items-center justify-center overflow-hidden"
          aria-label="Camera preview"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', ...spring.gentle }}
        >
          {videoEnabled && previewStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-2xl text-gray-300">
                  {displayName ? displayName[0].toUpperCase() : '?'}
                </span>
              </div>
              <span className="text-gray-400 text-sm">Camera off</span>
            </div>
          )}
          {selectedBackground !== 'none' && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/50 text-white text-xs">
              {VIRTUAL_BACKGROUNDS.find((b) => b.id === selectedBackground)?.label}
            </div>
          )}
        </motion.div>

        {/* Virtual Background Selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Virtual Background</p>
          <div className="flex gap-2" role="radiogroup" aria-label="Select virtual background">
            {VIRTUAL_BACKGROUNDS.map((bg) => (
              <motion.button
                key={bg.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: 'spring', ...spring.snappy }}
                onClick={() => setSelectedBackground(bg.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors min-h-[44px] ${
                  selectedBackground === bg.id
                    ? 'border-[var(--quant-primary)] bg-blue-50 dark:bg-blue-950'
                    : 'border-[var(--quant-border)] hover:border-[var(--quant-muted-foreground)]'
                }`}
                role="radio"
                aria-checked={selectedBackground === bg.id}
                aria-label={bg.label}
              >
                <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs">
                  {bg.id === 'none' ? '\u2716' : bg.id === 'blur' ? '\u{1F300}' : bg.label[0]}
                </div>
                <span className="text-xs">{bg.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Audio/Video toggle + Audio Level Meter */}
        <div className="flex items-center justify-center gap-3">
          <motion.div whileTap={{ scale: 0.95 }} transition={{ type: 'spring', ...spring.snappy }}>
            <Button
              variant={audioEnabled ? 'primary' : 'secondary'}
              onClick={() => setAudioEnabled(!audioEnabled)}
              aria-label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              aria-pressed={audioEnabled}
              className="min-w-[44px] min-h-[44px]"
            >
              {audioEnabled ? 'Mic On' : 'Mic Off'}
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.95 }} transition={{ type: 'spring', ...spring.snappy }}>
            <Button
              variant={videoEnabled ? 'primary' : 'secondary'}
              onClick={() => setVideoEnabled(!videoEnabled)}
              aria-label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              aria-pressed={videoEnabled}
              className="min-w-[44px] min-h-[44px]"
            >
              {videoEnabled ? 'Cam On' : 'Cam Off'}
            </Button>
          </motion.div>

          {/* Audio Level Meter */}
          {audioEnabled && (
            <div
              className="flex items-end gap-0.5 h-6"
              aria-label={`Audio level: ${Math.round(audioLevel * 100)}%`}
              role="meter"
              aria-valuenow={Math.round(audioLevel * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              {[0.15, 0.3, 0.45, 0.6, 0.8].map((threshold, i) => (
                <motion.div
                  key={i}
                  className={`w-1 rounded-sm ${
                    audioLevel >= threshold ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  animate={{ height: audioLevel >= threshold ? `${12 + i * 3}px` : '4px' }}
                  transition={{ type: 'spring', ...spring.snappy }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Device Selectors */}
        <div className="space-y-3">
          <div>
            <label htmlFor="camera-select" className="block text-sm font-medium mb-1">
              Camera
            </label>
            <Select
              id="camera-select"
              options={cameras}
              value={selectedCamera}
              onChange={(e) => setSelectedCamera(e.target.value)}
              aria-label="Select camera"
            />
          </div>
          <div>
            <label htmlFor="mic-select" className="block text-sm font-medium mb-1">
              Microphone
            </label>
            <Select
              id="mic-select"
              options={mics}
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              aria-label="Select microphone"
            />
          </div>
          <div>
            <label htmlFor="speaker-select" className="block text-sm font-medium mb-1">
              Speaker
            </label>
            <Select
              id="speaker-select"
              options={speakers}
              value={selectedSpeaker}
              onChange={(e) => setSelectedSpeaker(e.target.value)}
              aria-label="Select speaker"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            aria-label="Display name"
          />
          <motion.div whileTap={{ scale: 0.97 }} transition={{ type: 'spring', ...spring.snappy }}>
            <Button
              variant="primary"
              onClick={handleJoin}
              disabled={!displayName.trim()}
              className="w-full min-h-[44px]"
            >
              Join Meeting
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
