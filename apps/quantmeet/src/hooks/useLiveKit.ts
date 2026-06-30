'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Room,
  RoomEvent,
  DisconnectReason,
  type Participant as LKParticipant,
} from 'livekit-client';

const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880';

export interface RemoteParticipant {
  participantId: string;
  displayName: string;
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isSpeaking: boolean;
}

export interface UseLiveKitOptions {
  roomId: string;
  token?: string;
  serverUrl?: string;
}

export interface UseLiveKitReturn {
  localStream: MediaStream | null;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  error: string | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  isSpeaking: boolean;
  remoteParticipants: RemoteParticipant[];
  toggleAudio: () => void;
  toggleVideo: () => void;
  toggleScreenShare: () => Promise<void>;
  disconnect: () => void;
}

/**
 * Build a MediaStream from a set of MediaStreamTracks. Returns null when there
 * are no live tracks so callers can render a placeholder instead of an empty
 * (and never-fabricated) stream.
 */
function buildStream(tracks: MediaStreamTrack[]): MediaStream | null {
  if (tracks.length === 0) return null;
  const stream = new MediaStream();
  for (const track of tracks) {
    stream.addTrack(track);
  }
  return stream;
}

/**
 * Compose a MediaStream for a remote participant from its subscribed
 * audio + video tracks. Only real, subscribed livekit-client tracks are used.
 */
function remoteStreamFor(participant: LKParticipant): MediaStream | null {
  const tracks: MediaStreamTrack[] = [];
  participant.trackPublications.forEach((pub) => {
    const mediaTrack = pub.track?.mediaStreamTrack;
    if (pub.isSubscribed && mediaTrack) {
      tracks.push(mediaTrack);
    }
  });
  return buildStream(tracks);
}

function toRemoteParticipant(participant: LKParticipant): RemoteParticipant {
  return {
    participantId: participant.identity,
    displayName: participant.name || participant.identity,
    stream: remoteStreamFor(participant),
    audioEnabled: participant.isMicrophoneEnabled,
    videoEnabled: participant.isCameraEnabled,
    isSpeaking: participant.isSpeaking,
  };
}

export function useLiveKit({ roomId, token, serverUrl }: UseLiveKitOptions): UseLiveKitReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);

  const roomRef = useRef<Room | null>(null);

  const resolvedUrl = serverUrl || LIVEKIT_URL;

  // Recompute the local MediaStream from the local participant's published
  // camera/microphone/screen-share tracks (real MediaStreamTracks only).
  const syncLocalStream = useCallback((room: Room) => {
    const tracks: MediaStreamTrack[] = [];
    room.localParticipant.videoTrackPublications.forEach((pub) => {
      const mediaTrack = pub.track?.mediaStreamTrack;
      if (mediaTrack) tracks.push(mediaTrack);
    });
    room.localParticipant.audioTrackPublications.forEach((pub) => {
      const mediaTrack = pub.track?.mediaStreamTrack;
      if (mediaTrack) tracks.push(mediaTrack);
    });
    setLocalStream(buildStream(tracks));
    setAudioEnabled(room.localParticipant.isMicrophoneEnabled);
    setVideoEnabled(room.localParticipant.isCameraEnabled);
    setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
  }, []);

  // Recompute the remote participants list from the room's current state.
  const syncRemoteParticipants = useCallback((room: Room) => {
    const next: RemoteParticipant[] = [];
    room.remoteParticipants.forEach((participant) => {
      next.push(toRemoteParticipant(participant));
    });
    setRemoteParticipants(next);
  }, []);

  useEffect(() => {
    if (!token || !roomId) return;

    let cancelled = false;
    const room = new Room();
    roomRef.current = room;

    const handleTrackSubscribed = () => {
      if (!cancelled) syncRemoteParticipants(room);
    };
    const handleTrackUnsubscribed = () => {
      if (!cancelled) syncRemoteParticipants(room);
    };
    const handleParticipantConnected = () => {
      if (!cancelled) syncRemoteParticipants(room);
    };
    const handleParticipantDisconnected = () => {
      if (!cancelled) syncRemoteParticipants(room);
    };
    const handleLocalTrackChanged = () => {
      if (!cancelled) syncLocalStream(room);
    };
    const handleActiveSpeakersChanged = (speakers: LKParticipant[]) => {
      if (cancelled) return;
      const speakingIds = new Set(speakers.map((s) => s.identity));
      setIsSpeaking(speakingIds.has(room.localParticipant.identity));
      setRemoteParticipants((prev) =>
        prev.map((p) => ({ ...p, isSpeaking: speakingIds.has(p.participantId) })),
      );
    };
    const handleReconnecting = () => {
      if (cancelled) return;
      setIsReconnecting(true);
      setReconnectAttempts((prev) => prev + 1);
    };
    const handleReconnected = () => {
      if (cancelled) return;
      setIsReconnecting(false);
      setIsConnected(true);
      setError(null);
    };
    const handleDisconnected = (reason?: DisconnectReason) => {
      if (cancelled) return;
      setIsConnected(false);
      if (reason !== undefined && reason !== DisconnectReason.CLIENT_INITIATED) {
        setError(`Disconnected from meeting (${DisconnectReason[reason] ?? 'unknown reason'})`);
      }
      setRemoteParticipants([]);
      setLocalStream(null);
    };

    room
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
      .on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
      .on(RoomEvent.TrackMuted, handleParticipantDisconnected)
      .on(RoomEvent.TrackUnmuted, handleParticipantDisconnected)
      .on(RoomEvent.LocalTrackPublished, handleLocalTrackChanged)
      .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackChanged)
      .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
      .on(RoomEvent.Reconnecting, handleReconnecting)
      .on(RoomEvent.Reconnected, handleReconnected)
      .on(RoomEvent.Disconnected, handleDisconnected);

    async function connect() {
      setIsConnecting(true);
      setError(null);
      setReconnectAttempts(0);

      try {
        await room.connect(resolvedUrl, token!);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        setIsConnected(true);

        // Enable local camera + microphone via real livekit-client APIs.
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(true);

        if (cancelled) {
          await room.disconnect();
          return;
        }

        syncLocalStream(room);
        syncRemoteParticipants(room);
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to connect to meeting';
          setError(message);
        }
      } finally {
        if (!cancelled) setIsConnecting(false);
      }
    }

    connect();

    return () => {
      cancelled = true;
      room
        .off(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        .off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
        .off(RoomEvent.ParticipantConnected, handleParticipantConnected)
        .off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
        .off(RoomEvent.TrackMuted, handleParticipantDisconnected)
        .off(RoomEvent.TrackUnmuted, handleParticipantDisconnected)
        .off(RoomEvent.LocalTrackPublished, handleLocalTrackChanged)
        .off(RoomEvent.LocalTrackUnpublished, handleLocalTrackChanged)
        .off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged)
        .off(RoomEvent.Reconnecting, handleReconnecting)
        .off(RoomEvent.Reconnected, handleReconnected)
        .off(RoomEvent.Disconnected, handleDisconnected);
      room.disconnect();
      roomRef.current = null;
      setLocalStream(null);
      setRemoteParticipants([]);
      setIsConnected(false);
      setIsConnecting(false);
      setIsReconnecting(false);
      setIsSpeaking(false);
      setIsScreenSharing(false);
    };
  }, [token, roomId, resolvedUrl, syncLocalStream, syncRemoteParticipants]);

  const toggleAudio = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isMicrophoneEnabled;
    setAudioEnabled(next);
    room.localParticipant
      .setMicrophoneEnabled(next)
      .then(() => syncLocalStream(room))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to toggle microphone');
        setAudioEnabled(room.localParticipant.isMicrophoneEnabled);
      });
  }, [syncLocalStream]);

  const toggleVideo = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isCameraEnabled;
    setVideoEnabled(next);
    room.localParticipant
      .setCameraEnabled(next)
      .then(() => syncLocalStream(room))
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to toggle camera');
        setVideoEnabled(room.localParticipant.isCameraEnabled);
      });
  }, [syncLocalStream]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !room.localParticipant.isScreenShareEnabled;
    try {
      await room.localParticipant.setScreenShareEnabled(next);
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
      syncLocalStream(room);
    } catch (err) {
      // User cancelling the screen-share picker rejects the promise; reflect the
      // real state rather than fabricating a share.
      setIsScreenSharing(room.localParticipant.isScreenShareEnabled);
      if (err instanceof Error && err.name !== 'NotAllowedError') {
        setError(err.message);
      }
    }
  }, [syncLocalStream]);

  const disconnect = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      room.disconnect();
    }
    setLocalStream(null);
    setRemoteParticipants([]);
    setIsConnected(false);
    setIsConnecting(false);
    setIsReconnecting(false);
    setReconnectAttempts(0);
    setIsScreenSharing(false);
    setIsSpeaking(false);
  }, []);

  return {
    localStream,
    isConnected,
    isConnecting,
    isReconnecting,
    reconnectAttempts,
    error,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    isSpeaking,
    remoteParticipants,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    disconnect,
  };
}
