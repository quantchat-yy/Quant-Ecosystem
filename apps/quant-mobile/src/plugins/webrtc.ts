// WebRTC Service - Peer-to-peer communication

export interface RTCConfig {
  iceServers: Array<{
    urls: string | string[];
    username?: string;
    credential?: string;
  }>;
  iceCandidatePoolSize?: number;
}

export interface MediaStream {
  id: string;
  active: boolean;
  tracks: MediaTrack[];
}

export interface MediaTrack {
  id: string;
  kind: 'audio' | 'video';
  enabled: boolean;
  muted: boolean;
}

export interface PeerConnection {
  id: string;
  state: 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';
  localDescription?: SessionDescription;
  remoteDescription?: SessionDescription;
}

export interface IceCandidate {
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}

export interface SessionDescription {
  type: 'offer' | 'answer';
  sdp: string;
}

export interface MediaConstraints {
  audio?: boolean | { echoCancellation?: boolean; noiseSuppression?: boolean };
  video?: boolean | { width?: number; height?: number; facingMode?: 'user' | 'environment' };
}

export class WebRTCService {
  private connections: Map<string, PeerConnection> = new Map();
  private connectionCounter = 0;

  createPeerConnection(config: RTCConfig): PeerConnection {
    if (!config.iceServers || config.iceServers.length === 0) {
      throw new Error('At least one ICE server is required');
    }
    const id = `pc-${++this.connectionCounter}`;
    const connection: PeerConnection = { id, state: 'new' };
    this.connections.set(id, connection);
    return connection;
  }

  async getUserMedia(constraints: MediaConstraints): Promise<MediaStream> {
    const tracks: MediaTrack[] = [];
    if (constraints.audio) {
      tracks.push({ id: `audio-${Date.now()}`, kind: 'audio', enabled: true, muted: false });
    }
    if (constraints.video) {
      tracks.push({ id: `video-${Date.now()}`, kind: 'video', enabled: true, muted: false });
    }
    return { id: `stream-${Date.now()}`, active: true, tracks };
  }

  async addIceCandidate(connectionId: string, candidate: IceCandidate): Promise<void> {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    if (!candidate.candidate) {
      throw new Error('Invalid ICE candidate');
    }
  }

  async setRemoteDescription(connectionId: string, sdp: SessionDescription): Promise<void> {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    conn.remoteDescription = sdp;
    conn.state = 'connecting';
  }

  async createOffer(connectionId: string): Promise<SessionDescription> {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    const offer: SessionDescription = {
      type: 'offer',
      sdp: `v=0\r\no=- ${Date.now()} 2 IN IP4 127.0.0.1\r\n`,
    };
    conn.localDescription = offer;
    return offer;
  }

  async createAnswer(connectionId: string): Promise<SessionDescription> {
    const conn = this.connections.get(connectionId);
    if (!conn) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    if (!conn.remoteDescription) {
      throw new Error('Remote description must be set before creating answer');
    }
    const answer: SessionDescription = {
      type: 'answer',
      sdp: `v=0\r\no=- ${Date.now()} 2 IN IP4 127.0.0.1\r\n`,
    };
    conn.localDescription = answer;
    return answer;
  }

  getConnection(connectionId: string): PeerConnection | null {
    return this.connections.get(connectionId) ?? null;
  }
}
