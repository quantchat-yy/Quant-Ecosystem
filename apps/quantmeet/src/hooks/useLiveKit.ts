'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseLiveKitOptions {
  roomId: string;
  token?: string;
}

export interface UseLiveKitReturn {
  localStream: MediaStream | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  disconnect: () => void;
}

export function useLiveKit({ roomId, token }: UseLiveKitOptions): UseLiveKitReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!token || !roomId) return;

    let cancelled = false;

    async function connect() {
      setIsConnecting(true);
      setError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsConnected(true);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to access media devices';
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsConnecting(false);
        }
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      setLocalStream(null);
      setIsConnected(false);
    };
  }, [token, roomId]);

  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setAudioEnabled((prev) => !prev);
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setVideoEnabled((prev) => !prev);
    }
  }, []);

  const toggleScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      screenStreamRef.current = screenStream;

      screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        screenStreamRef.current = null;
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share screen';
      setError(message);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setLocalStream(null);
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  return {
    localStream,
    isConnected,
    isConnecting,
    error,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    disconnect,
  };
}
