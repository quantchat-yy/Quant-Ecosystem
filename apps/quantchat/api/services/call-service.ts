// ============================================================================
// QuantChat - Call Service
// WebRTC signaling, SFU coordination, call management
// ============================================================================

import type { Call, CallType, CallStatus, CallParticipant, CallQuality, WebRTCSignal, CallRecording } from '../../src/types';

// ============================================================================
// ICE Server Configuration
// ============================================================================

interface ICEServer {
  urls: string[];
  username?: string;
  credential?: string;
}

const ICE_SERVERS: ICEServer[] = [
  { urls: ['stun:stun.quant.chat:3478'] },
  { urls: ['turn:turn.quant.chat:3478'], username: 'quantchat', credential: 'turn-secret' },
  { urls: ['turn:turn.quant.chat:5349'], username: 'quantchat', credential: 'turn-secret' },
];

// ============================================================================
// SFU (Selective Forwarding Unit) Simulator
// ============================================================================

interface SFURoom {
  id: string;
  callId: string;
  participants: Map<string, SFUParticipant>;
  createdAt: Date;
  maxParticipants: number;
  codec: 'VP8' | 'VP9' | 'H264' | 'AV1';
  simulcast: boolean;
}

interface SFUParticipant {
  userId: string;
  publishTracks: MediaTrack[];
  subscribeTracks: string[];
  bandwidth: number;
  quality: 'high' | 'medium' | 'low';
}

interface MediaTrack {
  id: string;
  type: 'audio' | 'video' | 'screen';
  codec: string;
  bitrate: number;
  active: boolean;
}

class SFUCoordinator {
  private rooms: Map<string, SFURoom> = new Map();

  createRoom(callId: string, maxParticipants: number = 32): SFURoom {
    const room: SFURoom = {
      id: `sfu_${callId}`,
      callId,
      participants: new Map(),
      createdAt: new Date(),
      maxParticipants,
      codec: 'VP9',
      simulcast: true,
    };
    this.rooms.set(room.id, room);
    return room;
  }

  joinRoom(roomId: string, userId: string): SFUParticipant | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.participants.size >= room.maxParticipants) return null;

    const participant: SFUParticipant = {
      userId,
      publishTracks: [],
      subscribeTracks: [],
      bandwidth: 2500000, // 2.5 Mbps default
      quality: 'high',
    };

    room.participants.set(userId, participant);
    return participant;
  }

  leaveRoom(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.participants.delete(userId);
      if (room.participants.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  addTrack(roomId: string, userId: string, track: MediaTrack): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const participant = room.participants.get(userId);
    if (participant) {
      participant.publishTracks.push(track);
    }
  }

  removeTrack(roomId: string, userId: string, trackId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const participant = room.participants.get(userId);
    if (participant) {
      participant.publishTracks = participant.publishTracks.filter(t => t.id !== trackId);
    }
  }

  adjustQuality(roomId: string, userId: string, quality: 'high' | 'medium' | 'low'): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const participant = room.participants.get(userId);
    if (participant) {
      participant.quality = quality;
      const bandwidthMap = { high: 2500000, medium: 1000000, low: 500000 };
      participant.bandwidth = bandwidthMap[quality];
    }
  }

  getRoom(roomId: string): SFURoom | null {
    return this.rooms.get(roomId) || null;
  }

  getActiveRoomCount(): number {
    return this.rooms.size;
  }
}

// ============================================================================
// Call Service
// ============================================================================

export class CallService {
  private calls: Map<string, Call> = new Map();
  private sfu: SFUCoordinator;
  private signalQueue: Map<string, WebRTCSignal[]> = new Map();
  private recordings: Map<string, CallRecording> = new Map();
  private callHistory: Map<string, string[]> = new Map(); // userId -> callIds

  constructor() {
    this.sfu = new SFUCoordinator();
  }

  async initiateCall(initiatorId: string, participantIds: string[], type: CallType, isGroupCall: boolean = false, groupId?: string): Promise<Call> {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const call: Call = {
      id: callId,
      callId,
      type,
      initiatorId,
      participants: [
        {
          userId: initiatorId,
          joinedAt: new Date(),
          isMuted: false,
          isVideoEnabled: type === 'video',
          isScreenSharing: false,
        },
      ],
      status: 'ringing',
      isGroupCall,
      groupId,
      isScreenSharing: false,
      isRecording: false,
      quality: {
        bitrate: type === 'video' ? 2500000 : 64000,
        frameRate: type === 'video' ? 30 : 0,
        resolution: type === 'video' ? '1280x720' : 'audio-only',
        packetLoss: 0,
        latency: 50,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.calls.set(callId, call);

    // Create SFU room for group calls or video
    if (isGroupCall || type === 'video') {
      const room = this.sfu.createRoom(callId, isGroupCall ? 32 : 2);
      this.sfu.joinRoom(room.id, initiatorId);
    }

    // Generate signals for participants
    for (const participantId of participantIds) {
      const signal: WebRTCSignal = {
        type: 'offer',
        from: initiatorId,
        to: participantId,
        callId,
        payload: {
          type: 'offer',
          sdp: this.generateSDP(type, initiatorId),
          iceServers: ICE_SERVERS,
        },
      };
      this.queueSignal(participantId, signal);
    }

    // Track in call history
    this.addToHistory(initiatorId, callId);
    for (const id of participantIds) {
      this.addToHistory(id, callId);
    }

    return call;
  }

  async answerCall(callId: string, userId: string): Promise<Call> {
    const call = this.calls.get(callId);
    if (!call) throw new Error('Call not found');
    if (call.status !== 'ringing') throw new Error('Call is not ringing');

    call.status = 'active';
    call.startedAt = new Date();
    call.participants.push({
      userId,
      joinedAt: new Date(),
      isMuted: false,
      isVideoEnabled: call.type === 'video',
      isScreenSharing: false,
    });
    call.updatedAt = new Date();

    // Join SFU room
    const roomId = `sfu_${callId}`;
    this.sfu.joinRoom(roomId, userId);

    // Send answer signal
    const signal: WebRTCSignal = {
      type: 'answer',
      from: userId,
      to: call.initiatorId,
      callId,
      payload: {
        type: 'answer',
        sdp: this.generateSDP(call.type, userId),
      },
    };
    this.queueSignal(call.initiatorId, signal);

    return call;
  }

  async declineCall(callId: string, userId: string): Promise<Call> {
    const call = this.calls.get(callId);
    if (!call) throw new Error('Call not found');

    call.status = 'declined';
    call.endedAt = new Date();
    call.updatedAt = new Date();

    // Notify initiator
    const signal: WebRTCSignal = {
      type: 'hangup',
      from: userId,
      to: call.initiatorId,
      callId,
      payload: { reason: 'declined' },
    };
    this.queueSignal(call.initiatorId, signal);

    return call;
  }

  async endCall(callId: string, userId: string): Promise<Call> {
    const call = this.calls.get(callId);
    if (!call) throw new Error('Call not found');

    call.status = 'ended';
    call.endedAt = new Date();
    if (call.startedAt) {
      call.duration = Math.floor((call.endedAt.getTime() - call.startedAt.getTime()) / 1000);
    }
    call.updatedAt = new Date();

    // Mark participant as left
    const participant = call.participants.find(p => p.userId === userId);
    if (participant) {
      participant.leftAt = new Date();
    }

    // End for all if not group call, or if initiator left
    if (!call.isGroupCall || userId === call.initiatorId) {
      for (const p of call.participants) {
        if (!p.leftAt) p.leftAt = new Date();
        const hangup: WebRTCSignal = {
          type: 'hangup',
          from: userId,
          to: p.userId,
          callId,
          payload: { reason: 'ended' },
        };
        if (p.userId !== userId) {
          this.queueSignal(p.userId, hangup);
        }
      }
    }

    // Leave SFU room
    const roomId = `sfu_${callId}`;
    this.sfu.leaveRoom(roomId, userId);

    // Stop recording if active
    if (call.isRecording) {
      await this.stopRecording(callId);
    }

    return call;
  }

  async toggleMute(callId: string, userId: string): Promise<CallParticipant> {
    const call = this.calls.get(callId);
    if (!call) throw new Error('Call not found');

    const participant = call.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('Participant not found');

    participant.isMuted = !participant.isMuted;
    return participant;
  }

  async toggleVideo(callId: string, userId: string): Promise<CallParticipant> {
    const call = this.calls.get(callId);
    if (!call) throw new Error('Call not found');

    const participant = call.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('Participant not found');

    participant.isVideoEnabled = !participant.isVideoEnabled;
    return participant;
  }

  async startScreenShare(callId: string, userId: string): Promise<Call> {
    const call = this.calls.get(callId);
    if (!call) throw new Error('Call not found');

    const participant = call.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('Participant not found');

    participant.isScreenSharing = true;
    call.isScreenSharing = true;
    call.updatedAt = new Date();

    // Add screen share track to SFU
    const roomId = `sfu_${callId}`;
    this.sfu.addTrack(roomId, userId, {
      id: `track_screen_${userId}`,
      type: 'screen',
      codec: 'VP9',
      bitrate: 3000000,
      active: true,
    });

    return call;
  }

  async stopScreenShare(callId: string, userId: string): Promise<Call> {
    const call = this.calls.get(callId);
    if (!call) throw new Error('Call not found');

    const participant = call.participants.find(p => p.userId === userId);
    if (!participant) throw new Error('Participant not found');

    participant.isScreenSharing = false;
    call.isScreenSharing = call.participants.some(p => p.isScreenSharing);
    call.updatedAt = new Date();

    const roomId = `sfu_${callId}`;
    this.sfu.removeTrack(roomId, userId, `track_screen_${userId}`);

    return call;
  }

  async startRecording(callId: string): Promise<Call> {
    const call = this.calls.get(callId);
    if (!call) throw new Error('Call not found');

    call.isRecording = true;
    call.updatedAt = new Date();
    return call;
  }

  async stopRecording(callId: string): Promise<CallRecording | null> {
    const call = this.calls.get(callId);
    if (!call || !call.isRecording) return null;

    call.isRecording = false;
    call.updatedAt = new Date();

    const duration = call.startedAt
      ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
      : 0;

    const recording: CallRecording = {
      callId,
      url: `https://media.quant.chat/recordings/${callId}.webm`,
      duration,
      size: duration * 50000, // ~50KB per second estimate
      createdAt: new Date(),
    };

    this.recordings.set(callId, recording);
    call.recordingUrl = recording.url;
    return recording;
  }

  async getCall(callId: string): Promise<Call | null> {
    return this.calls.get(callId) || null;
  }

  async getCallHistory(userId: string, limit: number = 20): Promise<Call[]> {
    const callIds = this.callHistory.get(userId) || [];
    const calls: Call[] = [];
    for (const id of callIds.slice(-limit).reverse()) {
      const call = this.calls.get(id);
      if (call) calls.push(call);
    }
    return calls;
  }

  getSignals(userId: string): WebRTCSignal[] {
    const signals = this.signalQueue.get(userId) || [];
    this.signalQueue.delete(userId);
    return signals;
  }

  sendICECandidate(from: string, to: string, callId: string, candidate: unknown): void {
    const signal: WebRTCSignal = {
      type: 'ice-candidate',
      from,
      to,
      callId,
      payload: candidate,
    };
    this.queueSignal(to, signal);
  }

  getICEServers(): ICEServer[] {
    return ICE_SERVERS;
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private queueSignal(userId: string, signal: WebRTCSignal): void {
    const queue = this.signalQueue.get(userId) || [];
    queue.push(signal);
    this.signalQueue.set(userId, queue);
  }

  private addToHistory(userId: string, callId: string): void {
    const history = this.callHistory.get(userId) || [];
    history.push(callId);
    this.callHistory.set(userId, history);
  }

  private generateSDP(type: CallType, userId: string): string {
    const sessionId = Math.floor(Math.random() * 1000000000);
    const lines = [
      'v=0',
      `o=${userId} ${sessionId} 2 IN IP4 0.0.0.0`,
      's=QuantChat',
      't=0 0',
      `a=group:BUNDLE ${type === 'video' ? '0 1' : '0'}`,
      'a=msid-semantic: WMS',
      `m=audio 9 UDP/TLS/RTP/SAVPF 111`,
      'c=IN IP4 0.0.0.0',
      'a=rtcp:9 IN IP4 0.0.0.0',
      'a=mid:0',
      'a=sendrecv',
      'a=rtpmap:111 opus/48000/2',
    ];

    if (type === 'video') {
      lines.push(
        'm=video 9 UDP/TLS/RTP/SAVPF 96',
        'c=IN IP4 0.0.0.0',
        'a=rtcp:9 IN IP4 0.0.0.0',
        'a=mid:1',
        'a=sendrecv',
        'a=rtpmap:96 VP9/90000',
      );
    }

    return lines.join('\r\n');
  }

  getStats(): { activeCalls: number; totalCalls: number; sfuRooms: number } {
    let active = 0;
    for (const call of this.calls.values()) {
      if (call.status === 'active' || call.status === 'ringing') active++;
    }
    return {
      activeCalls: active,
      totalCalls: this.calls.size,
      sfuRooms: this.sfu.getActiveRoomCount(),
    };
  }
}

export const callService = new CallService();
