// ============================================================================
// QuantMeet — Durable meeting transcripts (Prisma-backed)
//
// Previously TranscriptService kept every transcript segment in an in-memory
// `Map<string, TranscriptSegment[]>`, so all transcript data was lost on
// restart/redeploy and was never shared across backend instances. This rewrite
// makes transcripts DURABLE by persisting each segment to the Prisma
// `MeetingTranscriptSegment` model while preserving the existing transcriber
// (audio → text) compute behavior.
//
// The public `TranscriptSegment` shape and the EXACT createAppError message /
// code / status are preserved (the route + tests depend on them):
//   'Audio buffer is empty' 400 EMPTY_AUDIO_BUFFER
//
// The read methods (getTranscript / getFullTranscript) are now ASYNC. Segments
// are created LAZILY as audio chunks arrive, so startTranscription is now a
// no-op kept only for API compatibility. The Prisma client is injected through
// a NARROW interface (`TranscriptPrisma`) covering only the
// `meetingTranscriptSegment` delegate operations this service issues, mirroring
// the repo's established DI pattern (see RecordingService / RoomService):
// prisma FIRST, then the existing collaborators.
// ============================================================================

import { createAppError } from '@quant/server-core';

export interface TranscriptSegment {
  id: string;
  roomId: string;
  participantId: string;
  text: string;
  timestamp: Date;
  duration: number;
  confidence: number;
}

export interface Transcriber {
  transcribe(audioBuffer: Buffer): Promise<{ text: string; duration: number; confidence: number }>;
}

// ---------------------------------------------------------------------------
// Persisted row shape (the subset of columns this service reads/writes).
// ---------------------------------------------------------------------------

/** A persisted `MeetingTranscriptSegment` row. */
export interface TranscriptSegmentRow {
  id: string;
  roomId: string;
  participantId: string;
  text: string;
  duration: number;
  confidence: number;
  timestamp: Date;
}

/**
 * Narrow view of the Prisma client — exactly the `meetingTranscriptSegment`
 * delegate operations {@link TranscriptService} issues. Injected via the
 * constructor so the service can run against the real client in production and
 * an in-memory fake in tests.
 */
export interface TranscriptPrisma {
  meetingTranscriptSegment: {
    create(args: { data: Record<string, unknown> }): Promise<TranscriptSegmentRow>;
    findMany(args: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
    }): Promise<TranscriptSegmentRow[]>;
    deleteMany(args: { where?: Record<string, unknown> }): Promise<{ count: number }>;
  };
}

export class TranscriptService {
  constructor(
    private readonly prisma: TranscriptPrisma,
    private readonly transcriber: Transcriber,
  ) {}

  /**
   * Transcribe an audio chunk and persist the resulting segment.
   *
   * @throws createAppError('Audio buffer is empty', 400, 'EMPTY_AUDIO_BUFFER')
   *   when the audio buffer is missing or empty.
   */
  async processAudioChunk(
    roomId: string,
    participantId: string,
    audioBuffer: Buffer,
  ): Promise<TranscriptSegment> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw createAppError('Audio buffer is empty', 400, 'EMPTY_AUDIO_BUFFER');
    }

    const result = await this.transcriber.transcribe(audioBuffer);

    const row = await this.prisma.meetingTranscriptSegment.create({
      data: {
        roomId,
        participantId,
        text: result.text,
        duration: result.duration,
        confidence: result.confidence,
        timestamp: new Date(),
      },
    });

    return this.toSegment(row);
  }

  /**
   * No-op kept for API compatibility. Segments are created lazily as audio
   * chunks arrive (see {@link processAudioChunk} / {@link addSegment}), so there
   * is no per-room state to initialize.
   */
  startTranscription(_roomId: string): void {
    // Intentionally empty — rows are created lazily on add.
  }

  /** Persist a manually supplied transcript segment. */
  async addSegment(
    roomId: string,
    segment: Omit<TranscriptSegment, 'id'>,
  ): Promise<TranscriptSegment> {
    const row = await this.prisma.meetingTranscriptSegment.create({
      data: {
        roomId,
        participantId: segment.participantId,
        text: segment.text,
        duration: segment.duration,
        confidence: segment.confidence,
        timestamp: segment.timestamp,
      },
    });

    return this.toSegment(row);
  }

  /** Render a room's transcript as `[participant]: text` lines, oldest first. */
  async getFullTranscript(roomId: string): Promise<string> {
    const segments = await this.getTranscript(roomId);
    return segments.map((s) => `[${s.participantId}]: ${s.text}`).join('\n');
  }

  /** Load a room's transcript segments, oldest first. */
  async getTranscript(roomId: string): Promise<TranscriptSegment[]> {
    const rows = await this.prisma.meetingTranscriptSegment.findMany({
      where: { roomId },
      orderBy: { timestamp: 'asc' },
    });
    return rows.map((row) => this.toSegment(row));
  }

  /** Delete all transcript segments for a room. */
  async clearTranscript(roomId: string): Promise<void> {
    await this.prisma.meetingTranscriptSegment.deleteMany({ where: { roomId } });
  }

  // -------------------------------------------------------------------------
  // Mapping helpers
  // -------------------------------------------------------------------------

  /** Map a persisted segment row to the public TranscriptSegment shape. */
  private toSegment(row: TranscriptSegmentRow): TranscriptSegment {
    return {
      id: row.id,
      roomId: row.roomId,
      participantId: row.participantId,
      text: row.text,
      timestamp: row.timestamp,
      duration: row.duration,
      confidence: row.confidence,
    };
  }
}
