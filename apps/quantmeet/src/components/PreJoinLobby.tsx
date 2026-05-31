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
  const videoRef = useRef<HTMLVideoElement>(null);

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
        </motion.div>

        <div className="flex justify-center gap-3">
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
        </div>

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
