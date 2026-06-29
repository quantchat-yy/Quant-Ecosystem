// ============================================================================
// QuantMeet — Durable meeting summaries (Prisma-backed)
//
// Previously SummaryService kept generated summaries in an in-memory
// `Map<string, MeetingSummary>`, so AI summaries were lost on restart/redeploy
// and never shared across backend instances. This rewrite makes summaries
// DURABLE by persisting them to the Prisma `MeetingSummary` model (one summary
// per room, keyed by the unique `roomId`) while preserving the existing AI
// (transcript → summary) compute behavior.
//
// The EXACT createAppError messages / codes / statuses are preserved (the route
// + tests depend on them):
//   'Transcript is empty'          400 EMPTY_TRANSCRIPT
//   'No transcript found for room' 404 TRANSCRIPT_NOT_FOUND
//
// getSummary is now ASYNC (findUnique by roomId). generateFromRoomId AWAITs the
// now-async transcript read. The Prisma client is injected through a NARROW
// interface (`SummaryPrisma`) covering only the `meetingSummary` delegate
// operations this service issues, mirroring the repo's established DI pattern:
// prisma FIRST, then the existing collaborators.
// ============================================================================

import { randomUUID } from 'node:crypto';
import { createAppError } from '@quant/server-core';
import type { TranscriptSegment } from './transcript.service';
import type { TranscriptService } from './transcript.service';

export interface MeetingSummary {
  id: string;
  roomId: string | null;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  generatedAt: Date;
}

/**
 * Local AIInference interface for scaffold purposes.
 * This interface mirrors the patterns in @quant/ai and should be aligned
 * with the actual @quant/ai package types in a future integration pass.
 */
export interface AIInference {
  generateText(prompt: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Persisted row shape (the subset of columns this service reads/writes).
// keyPoints / decisions are stored as JSON arrays.
// ---------------------------------------------------------------------------

/** A persisted `MeetingSummary` row. */
export interface MeetingSummaryRow {
  id: string;
  roomId: string;
  summary: string;
  keyPoints: unknown;
  decisions: unknown;
  generatedAt: Date;
}

/**
 * Narrow view of the Prisma client — exactly the `meetingSummary` delegate
 * operations {@link SummaryService} issues. Injected via the constructor so the
 * service can run against the real client in production and an in-memory fake
 * in tests.
 */
export interface SummaryPrisma {
  meetingSummary: {
    upsert(args: {
      where: { roomId: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }): Promise<MeetingSummaryRow>;
    findUnique(args: { where: { roomId: string } }): Promise<MeetingSummaryRow | null>;
  };
}

export class SummaryService {
  constructor(
    private readonly prisma: SummaryPrisma,
    private readonly ai: AIInference,
  ) {}

  /**
   * Generate a meeting summary from transcript segments and persist it (one
   * summary per room, upserted by `roomId`). When the transcript carries no
   * room reference the summary is computed and returned but not persisted.
   *
   * @throws createAppError('Transcript is empty', 400, 'EMPTY_TRANSCRIPT') when
   *   the transcript has no segments.
   */
  async generateSummary(transcript: TranscriptSegment[]): Promise<MeetingSummary> {
    if (transcript.length === 0) {
      throw createAppError('Transcript is empty', 400, 'EMPTY_TRANSCRIPT');
    }

    const transcriptText = transcript.map((s) => `[${s.participantId}]: ${s.text}`).join('\n');

    const prompt = `Summarize the following meeting transcript. Provide a summary, key points, and decisions made.\n\nTranscript:\n${transcriptText}`;
    const result = await this.ai.generateText(prompt);

    const lines = result.split('\n').filter((l) => l.trim().length > 0);
    const summary = lines[0] ?? 'No summary available';
    const keyPoints = lines.slice(1, 4);
    const decisions = lines.slice(4, 7);

    const roomId = transcript[0]?.roomId ?? null;

    if (roomId) {
      const generatedAt = new Date();
      const row = await this.prisma.meetingSummary.upsert({
        where: { roomId },
        create: { roomId, summary, keyPoints, decisions, generatedAt },
        update: { summary, keyPoints, decisions, generatedAt },
      });
      return this.toSummary(row);
    }

    return {
      id: randomUUID(),
      roomId: null,
      summary,
      keyPoints,
      decisions,
      generatedAt: new Date(),
    };
  }

  /** Load the persisted summary for a room, or null when none exists. */
  async getSummary(roomId: string): Promise<MeetingSummary | null> {
    const row = await this.prisma.meetingSummary.findUnique({ where: { roomId } });
    return row ? this.toSummary(row) : null;
  }

  /**
   * Generate (and persist) a summary for a room by reading its transcript.
   *
   * @throws createAppError('No transcript found for room', 404,
   *   'TRANSCRIPT_NOT_FOUND') when the room has no transcript.
   */
  async generateFromRoomId(
    roomId: string,
    transcriptService: TranscriptService,
  ): Promise<MeetingSummary> {
    const transcript = await transcriptService.getTranscript(roomId);
    if (transcript.length === 0) {
      throw createAppError('No transcript found for room', 404, 'TRANSCRIPT_NOT_FOUND');
    }

    const meetingSummary = await this.generateSummary(transcript);
    return { ...meetingSummary, roomId };
  }

  // -------------------------------------------------------------------------
  // Mapping helpers
  // -------------------------------------------------------------------------

  /** Map a persisted summary row to the public MeetingSummary shape. */
  private toSummary(row: MeetingSummaryRow): MeetingSummary {
    return {
      id: row.id,
      roomId: row.roomId,
      summary: row.summary,
      keyPoints: this.toStringArray(row.keyPoints),
      decisions: this.toStringArray(row.decisions),
      generatedAt: row.generatedAt,
    };
  }

  /** Coerce a persisted JSON column into a string array. */
  private toStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
  }
}
