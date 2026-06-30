'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LoadingState } from '@quant/shared-ui';
import { useMeeting, useJoinRoom } from '../../../hooks/useMeeting';
import { useParticipants } from '../../../hooks/useParticipants';
import { useLiveKit } from '../../../hooks/useLiveKit';
import { PreJoinLobby } from '../../../components/PreJoinLobby';
import { ParticipantGrid } from '../../../components/ParticipantGrid';
import { ControlBar } from '../../../components/ControlBar';
import { ChatPanel } from '../../../components/ChatPanel';
import { ParticipantList } from '../../../components/ParticipantList';
import { MeetingEnded } from '../../../components/MeetingEnded';
import { ReactionsOverlay } from '../../../components/ReactionsOverlay';
import { ScreenShareOverlay } from '../../../components/ScreenShareOverlay';
import type { VideoTileProps, ChatMessage } from '../../../types/components';

type MeetingState = 'lobby' | 'connecting' | 'meeting' | 'ended';

export default function MeetingPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const { data: meeting } = useMeeting(roomId);
  const { data: participants } = useParticipants(roomId);
  const joinRoom = useJoinRoom();

  const [meetingState, setMeetingState] = useState<MeetingState>('lobby');
  const [token, setToken] = useState<string | undefined>(undefined);
  const [serverUrl, setServerUrl] = useState<string | undefined>(undefined);
  const [recordingActive, setRecordingActive] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [localParticipantId] = useState(() => crypto.randomUUID());
  const [handRaised, setHandRaised] = useState(false);
  const [sharePaused, setSharePaused] = useState(false);

  const liveKit = useLiveKit({ roomId, token, serverUrl });

  const handleJoin = useCallback(
    async (displayName: string) => {
      setMeetingState('connecting');
      try {
        await joinRoom.mutateAsync({ roomId, displayName });
        // Fetch a LiveKit join token from the member-only backend route, reusing
        // the same API base + fetch convention as the other QuantMeet hooks
        // (see src/hooks/useMeeting.ts — relative `/api/rooms/...`).
        const response = await fetch(`/api/rooms/${roomId}/livekit-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch LiveKit token');
        }
        const data = (await response.json()) as { token: string; serverUrl: string };
        setToken(data.token);
        setServerUrl(data.serverUrl);
        setMeetingState('meeting');
      } catch {
        setMeetingState('meeting');
      }
    },
    [roomId, joinRoom],
  );

  const handleLeave = useCallback(() => {
    liveKit.disconnect();
    setMeetingState('ended');
  }, [liveKit]);

  const handleSendMessage = useCallback(
    (content: string) => {
      const newMessage: ChatMessage = {
        id: crypto.randomUUID(),
        participantId: localParticipantId,
        displayName: 'You',
        content,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, newMessage]);
    },
    [localParticipantId],
  );

  const handleRejoin = useCallback(() => {
    setToken(undefined);
    setServerUrl(undefined);
    setMeetingState('lobby');
  }, []);

  const handleGoHome = useCallback(() => {
    router.push('/');
  }, [router]);

  if (meetingState === 'lobby') {
    return <PreJoinLobby onJoin={handleJoin} meetingTitle={meeting?.title} />;
  }

  if (meetingState === 'connecting') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingState text="Connecting to meeting..." />
      </div>
    );
  }

  if (meetingState === 'ended') {
    return (
      <MeetingEnded
        meetingTitle={meeting?.title}
        participantCount={participants?.length}
        hasRecording={recordingActive}
        onRejoin={handleRejoin}
        onGoHome={handleGoHome}
      />
    );
  }

  // LiveKit is the source of truth for video tiles: the local participant plus
  // every remote participant with their real subscribed MediaStreams.
  const videoParticipants: VideoTileProps[] = [
    {
      participantId: 'local',
      stream: liveKit.localStream,
      displayName: 'You',
      audioEnabled: liveKit.audioEnabled,
      videoEnabled: liveKit.videoEnabled,
      isSpeaking: liveKit.isSpeaking,
      isPinned: false,
      isScreenShare: liveKit.isScreenSharing,
    },
    ...liveKit.remoteParticipants.map((rp) => ({
      participantId: rp.participantId,
      stream: rp.stream,
      displayName: rp.displayName,
      audioEnabled: rp.audioEnabled,
      videoEnabled: rp.videoEnabled,
      isSpeaking: rp.isSpeaking,
      isPinned: false,
      isScreenShare: false,
    })),
  ];

  const connectionStatus = liveKit.isConnecting
    ? 'Connecting…'
    : liveKit.isReconnecting
      ? 'Reconnecting…'
      : liveKit.error
        ? liveKit.error
        : null;

  return (
    <div className="flex flex-col h-screen bg-[var(--quant-background)]">
      {/* Connection status banner */}
      {connectionStatus && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-2 text-sm text-center ${
            liveKit.error
              ? 'bg-red-500/15 text-red-300'
              : 'bg-[var(--brand-app-color)]/15 text-[var(--brand-app-color)]'
          }`}
        >
          {connectionStatus}
        </div>
      )}

      {/* Screen Share Overlay */}
      {liveKit.isScreenSharing && (
        <ScreenShareOverlay
          isPresenter={true}
          isPaused={sharePaused}
          onPauseShare={() => setSharePaused(true)}
          onResumeShare={() => setSharePaused(false)}
          onStopShare={() => {
            void liveKit.toggleScreenShare();
            setSharePaused(false);
          }}
        />
      )}

      {/* Reactions Overlay */}
      <ReactionsOverlay />

      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0">
          <ParticipantGrid
            participants={videoParticipants}
            layout="grid"
            activeSpeakerId={null}
            pinnedParticipantId={null}
          />
        </main>

        {showChat && (
          <ChatPanel
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            participantId={localParticipantId}
          />
        )}

        {showParticipants && !showChat && (
          <ParticipantList participants={participants ?? []} hostId={meeting?.hostId ?? null} />
        )}
      </div>

      <ControlBar
        audioEnabled={liveKit.audioEnabled}
        videoEnabled={liveKit.videoEnabled}
        screenShareEnabled={liveKit.isScreenSharing}
        recordingActive={recordingActive}
        onToggleAudio={() => {
          liveKit.toggleAudio();
        }}
        onToggleVideo={() => {
          liveKit.toggleVideo();
        }}
        onToggleScreenShare={() => {
          void liveKit.toggleScreenShare();
        }}
        onToggleRecording={() => setRecordingActive((prev) => !prev)}
        onLeave={handleLeave}
        onOpenChat={() => {
          setShowChat((prev) => !prev);
          setShowParticipants(false);
        }}
        onOpenTranscript={() => {
          setShowParticipants((prev) => !prev);
          setShowChat(false);
        }}
        handRaised={handRaised}
        onHandRaise={() => setHandRaised((prev) => !prev)}
        onReaction={() => {}}
        onBreakoutRooms={() => {}}
        onWhiteboard={() => {}}
      />
    </div>
  );
}
