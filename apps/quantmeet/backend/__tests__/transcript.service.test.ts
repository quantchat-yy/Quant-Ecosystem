// ============================================================================
// Unit tests — TranscriptService (durable meeting transcripts, Prisma-backed)
//
// TranscriptService persists transcript segments to the Prisma
// `MeetingTranscriptSegment` model so transcript data survives restarts and is
// shared across backend instances. A live PostgreSQL is not available in the
// sandbox, so — mirroring the repo's fake-prisma approach (see
// recording.service.test.ts) — these tests drive the REAL TranscriptService
// against a faithful in-memory model of the exact `meetingTranscriptSegment`
// delegate operations it issues:
//
//   prisma.meetingTranscriptSegment.create / findMany (orderBy) / deleteMany
//
// The transcriber (audio → text) is a stub. Read methods (getTranscript /
// getFullTranscript) are now async, and segment creation is async too.
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranscriptService } from '../services/transcript.service';
import type { TranscriptPrisma, TranscriptSegmentRow } from '../services/transcript.service';

// ---------------------------------------------------------------------------
// In-memory fake of the Prisma `meetingTranscriptSegment` delegate.
// ---------------------------------------------------------------------------
function createFakeTranscriptPrisma(): TranscriptPrisma & { __segments: TranscriptSegmentRow[] } {
  const segments: TranscriptSegmentRow[] = [];
  let seq = 0;

  const matches = (row: TranscriptSegmentRow, where?: Record<string, unknown>): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([key, value]) => {
      return (row as unknown as Record<string, unknown>)[key] === value;
    });
  };

  return {
    meetingTranscriptSegment: {
      async create({ data }) {
        seq += 1;
        const row: TranscriptSegmentRow = {
          id: (data['id'] as string) ?? `seg_${seq}`,
          roomId: String(data['roomId']),
          participantId: String(data['participantId']),
          text: String(data['text']),
          duration: (data['duration'] as number) ?? 0,
          confidence: (data['confidence'] as number) ?? 0,
          timestamp: (data['timestamp'] as Date) ?? new Date(),
        };
        segments.push(row);
        return { ...row };
      },
      async findMany({ where, orderBy }) {
        let result = segments.filter((r) => matches(r, where)).map((r) => ({ ...r }));
        if (orderBy && !Array.isArray(orderBy) && orderBy['timestamp'] === 'asc') {
          // Stable sort by timestamp ascending; insertion order breaks ties.
          result = result
            .map((row, index) => ({ row, index }))
            .sort(
              (a, b) => a.row.timestamp.getTime() - b.row.timestamp.getTime() || a.index - b.index,
            )
            .map((entry) => entry.row);
        }
        return result;
      },
      async deleteMany({ where }) {
        let count = 0;
        for (let i = segments.length - 1; i >= 0; i -= 1) {
          if (matches(segments[i]!, where)) {
            segments.splice(i, 1);
            count += 1;
          }
        }
        return { count };
      },
    },
    __segments: segments,
  };
}

function createStubTranscriber() {
  return {
    transcribe: vi.fn(),
  };
}

describe('TranscriptService — durable meeting transcripts', () => {
  let prisma: ReturnType<typeof createFakeTranscriptPrisma>;
  let transcriber: ReturnType<typeof createStubTranscriber>;
  let service: TranscriptService;

  beforeEach(() => {
    prisma = createFakeTranscriptPrisma();
    transcriber = createStubTranscriber();
    service = new TranscriptService(prisma, transcriber);
  });

  describe('processAudioChunk', () => {
    it('calls transcriber and persists the resulting segment', async () => {
      transcriber.transcribe.mockResolvedValue({
        text: 'Hello everyone',
        duration: 2.5,
        confidence: 0.95,
      });

      const segment = await service.processAudioChunk(
        'room-1',
        'participant-1',
        Buffer.from('audio-data'),
      );

      expect(segment.id).toBeDefined();
      expect(segment.roomId).toBe('room-1');
      expect(segment.participantId).toBe('participant-1');
      expect(segment.text).toBe('Hello everyone');
      expect(segment.duration).toBe(2.5);
      expect(segment.confidence).toBe(0.95);
      expect(segment.timestamp).toBeInstanceOf(Date);
      expect(transcriber.transcribe).toHaveBeenCalledWith(Buffer.from('audio-data'));
      expect(prisma.__segments).toHaveLength(1);
    });

    it('stores segment and makes it retrievable via getTranscript', async () => {
      transcriber.transcribe.mockResolvedValue({
        text: 'First chunk',
        duration: 1.0,
        confidence: 0.9,
      });

      await service.processAudioChunk('room-1', 'participant-1', Buffer.from('chunk-1'));

      const transcript = await service.getTranscript('room-1');
      expect(transcript).toHaveLength(1);
      expect(transcript[0]!.text).toBe('First chunk');
    });

    it('throws EMPTY_AUDIO_BUFFER for empty buffer', async () => {
      await expect(
        service.processAudioChunk('room-1', 'participant-1', Buffer.alloc(0)),
      ).rejects.toThrow('Audio buffer is empty');
      expect(prisma.__segments).toHaveLength(0);
    });

    it('stores multiple segments in order', async () => {
      transcriber.transcribe
        .mockResolvedValueOnce({ text: 'First', duration: 1.0, confidence: 0.9 })
        .mockResolvedValueOnce({ text: 'Second', duration: 1.5, confidence: 0.85 });

      await service.processAudioChunk('room-1', 'p-1', Buffer.from('chunk-1'));
      await service.processAudioChunk('room-1', 'p-2', Buffer.from('chunk-2'));

      const transcript = await service.getTranscript('room-1');
      expect(transcript).toHaveLength(2);
      expect(transcript[0]!.text).toBe('First');
      expect(transcript[1]!.text).toBe('Second');
    });

    it('stores segment even when transcriber returns empty text', async () => {
      transcriber.transcribe.mockResolvedValue({
        text: '',
        duration: 0.5,
        confidence: 0.1,
      });

      const segment = await service.processAudioChunk(
        'room-1',
        'participant-1',
        Buffer.from('silence'),
      );

      expect(segment.text).toBe('');
      const transcript = await service.getTranscript('room-1');
      expect(transcript).toHaveLength(1);
    });
  });

  describe('getTranscript', () => {
    it('returns all segments for a room in order', async () => {
      transcriber.transcribe
        .mockResolvedValueOnce({ text: 'A', duration: 1, confidence: 0.9 })
        .mockResolvedValueOnce({ text: 'B', duration: 1, confidence: 0.8 })
        .mockResolvedValueOnce({ text: 'C', duration: 1, confidence: 0.7 });

      await service.processAudioChunk('room-1', 'p-1', Buffer.from('a'));
      await service.processAudioChunk('room-1', 'p-2', Buffer.from('b'));
      await service.processAudioChunk('room-1', 'p-1', Buffer.from('c'));

      const transcript = await service.getTranscript('room-1');

      expect(transcript).toHaveLength(3);
      expect(transcript[0]!.text).toBe('A');
      expect(transcript[1]!.text).toBe('B');
      expect(transcript[2]!.text).toBe('C');
    });

    it('returns empty array for room with no transcript', async () => {
      const transcript = await service.getTranscript('empty-room');
      expect(transcript).toEqual([]);
    });

    it('does not return segments from other rooms', async () => {
      transcriber.transcribe
        .mockResolvedValueOnce({ text: 'Room 1', duration: 1, confidence: 0.9 })
        .mockResolvedValueOnce({ text: 'Room 2', duration: 1, confidence: 0.8 });

      await service.processAudioChunk('room-1', 'p-1', Buffer.from('a'));
      await service.processAudioChunk('room-2', 'p-2', Buffer.from('b'));

      const transcript = await service.getTranscript('room-1');
      expect(transcript).toHaveLength(1);
      expect(transcript[0]!.text).toBe('Room 1');
    });
  });

  describe('clearTranscript', () => {
    it('empties transcript for room', async () => {
      transcriber.transcribe.mockResolvedValue({
        text: 'Hello',
        duration: 1,
        confidence: 0.9,
      });

      await service.processAudioChunk('room-1', 'p-1', Buffer.from('data'));
      expect(await service.getTranscript('room-1')).toHaveLength(1);

      await service.clearTranscript('room-1');
      expect(await service.getTranscript('room-1')).toEqual([]);
    });

    it('does not affect other rooms', async () => {
      transcriber.transcribe
        .mockResolvedValueOnce({ text: 'Room 1', duration: 1, confidence: 0.9 })
        .mockResolvedValueOnce({ text: 'Room 2', duration: 1, confidence: 0.8 });

      await service.processAudioChunk('room-1', 'p-1', Buffer.from('a'));
      await service.processAudioChunk('room-2', 'p-2', Buffer.from('b'));

      await service.clearTranscript('room-1');

      expect(await service.getTranscript('room-1')).toEqual([]);
      expect(await service.getTranscript('room-2')).toHaveLength(1);
    });

    it('is safe to call on a room with no transcript', async () => {
      await expect(service.clearTranscript('non-existent-room')).resolves.toBeUndefined();
    });
  });

  describe('startTranscription', () => {
    it('is a no-op kept for API compatibility (no rows created)', async () => {
      service.startTranscription('room-new');

      expect(await service.getTranscript('room-new')).toEqual([]);
      expect(prisma.__segments).toHaveLength(0);
    });

    it('does not affect existing persisted transcript', async () => {
      transcriber.transcribe.mockResolvedValue({
        text: 'Existing',
        duration: 1,
        confidence: 0.9,
      });

      await service.processAudioChunk('room-1', 'p-1', Buffer.from('data'));
      service.startTranscription('room-1');

      expect(await service.getTranscript('room-1')).toHaveLength(1);
    });
  });

  describe('addSegment', () => {
    it('persists a segment with a generated id', async () => {
      const segment = await service.addSegment('room-1', {
        roomId: 'room-1',
        participantId: 'p-1',
        text: 'Manual segment',
        timestamp: new Date(),
        duration: 2.0,
        confidence: 0.9,
      });

      expect(segment.id).toBeDefined();
      expect(segment.text).toBe('Manual segment');

      const transcript = await service.getTranscript('room-1');
      expect(transcript).toHaveLength(1);
      expect(transcript[0]!.text).toBe('Manual segment');
    });
  });

  describe('getFullTranscript', () => {
    it('returns formatted transcript as text', async () => {
      transcriber.transcribe
        .mockResolvedValueOnce({ text: 'Hello everyone', duration: 1, confidence: 0.9 })
        .mockResolvedValueOnce({ text: 'Hi there', duration: 1, confidence: 0.85 });

      await service.processAudioChunk('room-1', 'alice', Buffer.from('a'));
      await service.processAudioChunk('room-1', 'bob', Buffer.from('b'));

      const fullText = await service.getFullTranscript('room-1');

      expect(fullText).toContain('[alice]: Hello everyone');
      expect(fullText).toContain('[bob]: Hi there');
    });

    it('returns empty string for room with no transcript', async () => {
      const fullText = await service.getFullTranscript('empty-room');
      expect(fullText).toBe('');
    });
  });
});
