import type { BrainDumpSession, TranscriptionConfig, VoiceSegment } from '../types.js';

export class VoiceTranscriber {
  private sessions = new Map<string, BrainDumpSession>();
  private segmentCounters = new Map<string, number>();

  startSession(config: TranscriptionConfig): BrainDumpSession {
    const session: BrainDumpSession = {
      id: crypto.randomUUID(),
      userId: '',
      startedAt: new Date(),
      status: 'active',
      segments: [],
    };

    this.sessions.set(session.id, session);
    this.segmentCounters.set(session.id, 0);

    void config;

    return session;
  }

  startSessionForUser(userId: string, config: TranscriptionConfig): BrainDumpSession {
    const session = this.startSession(config);
    session.userId = userId;
    return session;
  }

  processChunk(sessionId: string, audioChunk: Buffer): VoiceSegment {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (session.status !== 'active') {
      throw new Error(`Session is not active: ${sessionId}`);
    }

    const counter = (this.segmentCounters.get(sessionId) ?? 0) + 1;
    this.segmentCounters.set(sessionId, counter);

    const transcript = this.simulateTranscription(audioChunk);
    const startTime = (counter - 1) * 3.0;
    const endTime = counter * 3.0;

    const segment: VoiceSegment = {
      id: `${sessionId}-seg-${counter}`,
      startTime,
      endTime,
      transcript,
      confidence: 0.85 + Math.random() * 0.14,
    };

    session.segments.push(segment);
    return segment;
  }

  endSession(sessionId: string): VoiceSegment[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = 'completed';
    return [...session.segments];
  }

  getTranscript(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return session.segments.map((s) => s.transcript).join(' ');
  }

  getSession(sessionId: string): BrainDumpSession | undefined {
    return this.sessions.get(sessionId);
  }

  private simulateTranscription(audioChunk: Buffer): string {
    const text = audioChunk.toString('utf-8');
    return text.length > 0 ? text : '[inaudible]';
  }
}
