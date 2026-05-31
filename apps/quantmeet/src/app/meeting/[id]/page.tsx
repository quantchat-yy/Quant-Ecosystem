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
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [localParticipantId] = useState(() => crypto.randomUUID());

  const liveKit = useLiveKit({ roomId, token });

  const handleJoin = useCallback(
    async (displayName: string) => {
      setMeetingState('connecting');
      try {
        const result = await joinRoom.mutateAsync({ roomId, displayName });
        setToken(result.token);
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

  const videoParticipants: VideoTileProps[] = (participants ?? []).map((p) => ({
    participantId: p.id,
    stream: p.id === localParticipantId ? liveKit.localStream : null,
    displayName: p.displayName,
    audioEnabled: p.audioEnabled,
    videoEnabled: p.videoEnabled,
    isSpeaking: p.isSpeaking,
    isPinned: false,
    isScreenShare: p.isScreenSharing,
  }));

  return (
    <div className="flex flex-col h-screen bg-[var(--quant-background)]">
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
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        screenShareEnabled={screenShareEnabled}
        recordingActive={recordingActive}
        onToggleAudio={() => {
          liveKit.toggleAudio();
          setAudioEnabled((prev) => !prev);
        }}
        onToggleVideo={() => {
          liveKit.toggleVideo();
          setVideoEnabled((prev) => !prev);
        }}
        onToggleScreenShare={() => {
          liveKit.toggleScreenShare();
          setScreenShareEnabled((prev) => !prev);
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
      />
    </div>
  );
}
