// ============================================================================
// Unit tests — SummaryService (durable meeting summaries, Prisma-backed)
//
// SummaryService persists AI summaries to the Prisma `MeetingSummary` model
// (one summary per room, keyed by unique `roomId`) so summaries survive
// restarts and are shared across backend instances. A live PostgreSQL is not
// available in the sandbox, so — mirroring the repo's fake-prisma approach (see
// recording.service.test.ts) — these tests drive the REAL SummaryService
// against a faithful in-memory model of the exact `meetingSummary` delegate
// operations it issues:
//
//   prisma.meetingSummary.upsert (by roomId) / findUnique (by roomId)
//
// The AI (transcript → summary) is a stub. getSummary is now async, and
// generateFromRoomId awaits the now-async transcript read.
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SummaryService } from '../services/summary.service';
import type { SummaryPrisma, MeetingSummaryRow } from '../services/summary.service';
import type { TranscriptSegment } from '../services/transcript.service';

// ---------------------------------------------------------------------------
// In-memory fake of the Prisma `meetingSummary` delegate.
// ---------------------------------------------------------------------------
function createFakeSummaryPrisma(): SummaryPrisma & { __summaries: MeetingSummaryRow[] } {
  const summaries: MeetingSummaryRow[] = [];
  let seq = 0;

  return {
    meetingSummary: {
      async upsert({ where, create, update }) {
        const existing = summaries.find((r) => r.roomId === where.roomId);
        if (existing) {
          Object.assign(existing, update);
          return { ...existing };
        }
        seq += 1;
        const row: MeetingSummaryRow = {
          id: (create['id'] as string) ?? `sum_${seq}`,
          roomId: String(create['roomId']),
          summary: String(create['summary'] ?? ''),
          keyPoints: (create['keyPoints'] as unknown) ?? [],
          decisions: (create['decisions'] as unknown) ?? [],
          generatedAt: (create['generatedAt'] as Date) ?? new Date(),
        };
        summaries.push(row);
        return { ...row };
      },
      async findUnique({ where }) {
        const row = summaries.find((r) => r.roomId === where.roomId);
        return row ? { ...row } : null;
      },
    },
    __summaries: summaries,
  };
}

function createFakeTranscriptService(segments: TranscriptSegment[]) {
  return {
    getTranscript: vi.fn().mockResolvedValue(segments),
    getFullTranscript: vi.fn(),
    processAudioChunk: vi.fn(),
    clearTranscript: vi.fn(),
    addSegment: vi.fn(),
    startTranscription: vi.fn(),
  };
}

function createStubAI() {
  return {
    generateText: vi.fn(),
  };
}

function makeSegment(overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    id: 'seg-1',
    roomId: 'room-1',
    participantId: 'p-1',
    text: 'We should finish the feature by Friday',
    timestamp: new Date(),
    duration: 2.0,
    confidence: 0.95,
    ...overrides,
  };
}

describe('SummaryService — durable meeting summaries', () => {
  let prisma: ReturnType<typeof createFakeSummaryPrisma>;
  let ai: ReturnType<typeof createStubAI>;
  let service: SummaryService;

  beforeEach(() => {
    prisma = createFakeSummaryPrisma();
    ai = createStubAI();
    service = new SummaryService(prisma, ai);
  });

  describe('generateSummary', () => {
    it('takes transcript segments and returns MeetingSummary with summary, keyPoints, decisions', async () => {
      ai.generateText.mockResolvedValue(
        'Team discussed project timeline\nKey point 1\nKey point 2\nKey point 3\nDecision: Launch on Monday\nDecision: Use React\nDecision: Hire more devs',
      );

      const segments = [
        makeSegment({ text: 'We need to launch by Monday' }),
        makeSegment({ participantId: 'p-2', text: 'I agree, lets use React' }),
      ];

      const result = await service.generateSummary(segments);

      expect(result.id).toBeDefined();
      expect(result.summary).toBe('Team discussed project timeline');
      expect(result.keyPoints).toHaveLength(3);
      expect(result.decisions).toHaveLength(3);
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.roomId).toBe('room-1');
    });

    it('persists the summary keyed by roomId (durable)', async () => {
      ai.generateText.mockResolvedValue('Persisted summary\nPoint A');

      await service.generateSummary([makeSegment({ roomId: 'room-1' })]);

      expect(prisma.__summaries).toHaveLength(1);
      expect(prisma.__summaries[0]!.roomId).toBe('room-1');
      expect(prisma.__summaries[0]!.summary).toBe('Persisted summary');
    });

    it('upserts (one summary per room) on regeneration', async () => {
      ai.generateText
        .mockResolvedValueOnce('First summary')
        .mockResolvedValueOnce('Second summary');

      await service.generateSummary([makeSegment({ roomId: 'room-1' })]);
      await service.generateSummary([makeSegment({ roomId: 'room-1' })]);

      expect(prisma.__summaries).toHaveLength(1);
      expect(prisma.__summaries[0]!.summary).toBe('Second summary');
    });

    it('throws EMPTY_TRANSCRIPT when transcript is empty', async () => {
      await expect(service.generateSummary([])).rejects.toThrow('Transcript is empty');
    });

    it('calls AI with a prompt containing transcript text', async () => {
      ai.generateText.mockResolvedValue('Summary line');

      const segments = [makeSegment({ text: 'Hello world', participantId: 'p-1' })];
      await service.generateSummary(segments);

      expect(ai.generateText).toHaveBeenCalledTimes(1);
      const prompt = ai.generateText.mock.calls[0]![0] as string;
      expect(prompt).toContain('[p-1]: Hello world');
      expect(prompt).toContain('Summarize');
    });

    it('handles AI returning a single line', async () => {
      ai.generateText.mockResolvedValue('Brief summary with no details');

      const segments = [makeSegment()];
      const result = await service.generateSummary(segments);

      expect(result.summary).toBe('Brief summary with no details');
      expect(result.keyPoints).toEqual([]);
      expect(result.decisions).toEqual([]);
    });

    it('sets roomId from the first segment', async () => {
      ai.generateText.mockResolvedValue('Summary');

      const segments = [makeSegment({ roomId: 'room-xyz' })];
      const result = await service.generateSummary(segments);

      expect(result.roomId).toBe('room-xyz');
    });
  });

  describe('generateFromRoomId', () => {
    it('fetches transcript from transcriptService and generates summary', async () => {
      const segments = [
        makeSegment({ text: 'Lets plan the sprint' }),
        makeSegment({ participantId: 'p-2', text: 'Good idea' }),
      ];
      const transcriptService = createFakeTranscriptService(segments);
      ai.generateText.mockResolvedValue('Sprint planning discussion\nPoint A\nPoint B');

      const result = await service.generateFromRoomId('room-1', transcriptService as never);

      expect(transcriptService.getTranscript).toHaveBeenCalledWith('room-1');
      expect(result.roomId).toBe('room-1');
      expect(result.summary).toBe('Sprint planning discussion');
    });

    it('throws TRANSCRIPT_NOT_FOUND when room has no transcript', async () => {
      const transcriptService = createFakeTranscriptService([]);

      await expect(
        service.generateFromRoomId('room-empty', transcriptService as never),
      ).rejects.toThrow('No transcript found for room');
    });

    it('passes transcript to AI for summary generation', async () => {
      const segments = [makeSegment({ text: 'Important discussion' })];
      const transcriptService = createFakeTranscriptService(segments);
      ai.generateText.mockResolvedValue('Meeting summary');

      await service.generateFromRoomId('room-1', transcriptService as never);

      expect(ai.generateText).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSummary', () => {
    it('returns null when no summary exists for room', async () => {
      const result = await service.getSummary('room-nonexistent');
      expect(result).toBeNull();
    });

    it('returns the persisted summary for a room after generation', async () => {
      ai.generateText.mockResolvedValue('Summary text\nKey point');

      const segments = [makeSegment({ roomId: 'room-1' })];
      await service.generateSummary(segments);

      const result = await service.getSummary('room-1');

      expect(result).not.toBeNull();
      expect(result!.summary).toBe('Summary text');
      expect(result!.roomId).toBe('room-1');
      expect(result!.keyPoints).toEqual(['Key point']);
    });
  });
});
