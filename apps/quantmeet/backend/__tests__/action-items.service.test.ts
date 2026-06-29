// ============================================================================
// Unit tests — ActionItemsService (durable meeting action items, Prisma-backed)
//
// ActionItemsService persists extracted action items to the Prisma
// `MeetingActionItem` model so action items survive restarts and are shared
// across backend instances. A live PostgreSQL is not available in the sandbox,
// so — mirroring the repo's fake-prisma approach (see recording.service.test.ts)
// — these tests drive the REAL ActionItemsService against a faithful in-memory
// model of the exact `meetingActionItem` delegate operations it issues:
//
//   prisma.meetingActionItem.create / findMany (orderBy) / update
//
// The AI (transcript → action items) is a stub. `extractActionItems` stays a
// pure compute (no persistence); `extractFromRoomId` persists. getActionItems
// and completeActionItem are now async; extractFromRoomId awaits the now-async
// transcript read.
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionItemsService } from '../services/action-items.service';
import type { ActionItemsPrisma, MeetingActionItemRow } from '../services/action-items.service';
import type { TranscriptSegment } from '../services/transcript.service';

// ---------------------------------------------------------------------------
// In-memory fake of the Prisma `meetingActionItem` delegate.
// ---------------------------------------------------------------------------
function createFakeActionItemsPrisma(): ActionItemsPrisma & { __items: MeetingActionItemRow[] } {
  const items: MeetingActionItemRow[] = [];
  let seq = 0;
  let clock = 1_700_000_000_000;
  const tick = (): Date => new Date((clock += 1000));

  const matches = (row: MeetingActionItemRow, where?: Record<string, unknown>): boolean => {
    if (!where) return true;
    return Object.entries(where).every(([key, value]) => {
      return (row as unknown as Record<string, unknown>)[key] === value;
    });
  };

  return {
    meetingActionItem: {
      async create({ data }) {
        seq += 1;
        const row: MeetingActionItemRow = {
          id: (data['id'] as string) ?? `ai_${seq}`,
          roomId: String(data['roomId']),
          title: String(data['title'] ?? ''),
          description: String(data['description'] ?? ''),
          assignee: (data['assignee'] as string | null) ?? null,
          dueDate: (data['dueDate'] as string | null) ?? null,
          priority: (data['priority'] as string) ?? 'medium',
          status: (data['status'] as string) ?? 'pending',
          createdAt: tick(),
        };
        items.push(row);
        return { ...row };
      },
      async findMany({ where, orderBy }) {
        let result = items.filter((r) => matches(r, where)).map((r) => ({ ...r }));
        if (orderBy && !Array.isArray(orderBy) && orderBy['createdAt'] === 'asc') {
          result = result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }
        return result;
      },
      async update({ where, data }) {
        const row = items.find((r) => r.id === where.id);
        if (!row) {
          throw new Error(`No MeetingActionItem row with id ${where.id}`);
        }
        Object.assign(row, data);
        return { ...row };
      },
    },
    __items: items,
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
    text: 'Alice should review the PR by tomorrow',
    timestamp: new Date(),
    duration: 2.0,
    confidence: 0.95,
    ...overrides,
  };
}

describe('ActionItemsService — durable meeting action items', () => {
  let prisma: ReturnType<typeof createFakeActionItemsPrisma>;
  let ai: ReturnType<typeof createStubAI>;
  let service: ActionItemsService;

  beforeEach(() => {
    prisma = createFakeActionItemsPrisma();
    ai = createStubAI();
    service = new ActionItemsService(prisma, ai);
  });

  describe('extractActionItems', () => {
    it('takes transcript segments and returns ActionItem array with proper fields (no persistence)', async () => {
      ai.generateText.mockResolvedValue(
        'Review the PR by tomorrow\nUpdate the documentation\nDeploy to staging',
      );

      const segments = [
        makeSegment({ text: 'Alice should review the PR' }),
        makeSegment({ participantId: 'p-2', text: 'Bob will update docs' }),
      ];

      const items = await service.extractActionItems(segments);

      expect(items).toHaveLength(3);
      expect(items[0]!.id).toBeDefined();
      expect(items[0]!.title).toBe('Review the PR by tomorrow');
      expect(items[0]!.priority).toBe('medium');
      expect(items[0]!.status).toBe('pending');
      expect(items[0]!.assignee).toBeNull();
      expect(items[0]!.dueDate).toBeNull();
      // Pure compute — nothing persisted.
      expect(prisma.__items).toHaveLength(0);
    });

    it('returns empty array when AI returns no actionable content', async () => {
      ai.generateText.mockResolvedValue('');

      const segments = [makeSegment({ text: 'Just chatting about weather' })];

      const items = await service.extractActionItems(segments);

      expect(items).toEqual([]);
    });

    it('throws EMPTY_TRANSCRIPT when transcript is empty', async () => {
      await expect(service.extractActionItems([])).rejects.toThrow('Transcript is empty');
    });

    it('calls AI with a prompt containing transcript text', async () => {
      ai.generateText.mockResolvedValue('Do something');

      const segments = [makeSegment({ text: 'Fix the bug', participantId: 'dev-1' })];
      await service.extractActionItems(segments);

      expect(ai.generateText).toHaveBeenCalledTimes(1);
      const prompt = ai.generateText.mock.calls[0]![0] as string;
      expect(prompt).toContain('[dev-1]: Fix the bug');
      expect(prompt).toContain('Extract action items');
    });

    it('generates unique ids for each action item', async () => {
      ai.generateText.mockResolvedValue('Task 1\nTask 2\nTask 3');

      const segments = [makeSegment()];
      const items = await service.extractActionItems(segments);

      const ids = items.map((item) => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('extractFromRoomId', () => {
    it('fetches transcript from service then extracts and persists items', async () => {
      const segments = [
        makeSegment({ text: 'Alice should do the review' }),
        makeSegment({ participantId: 'p-2', text: 'Bob will deploy' }),
      ];
      const transcriptService = createFakeTranscriptService(segments);
      ai.generateText.mockResolvedValue('Review code\nDeploy app');

      const items = await service.extractFromRoomId('room-1', transcriptService as never);

      expect(transcriptService.getTranscript).toHaveBeenCalledWith('room-1');
      expect(items).toHaveLength(2);
      expect(items[0]!.title).toBe('Review code');
      expect(items[1]!.title).toBe('Deploy app');
      // Persisted and tagged with roomId.
      expect(prisma.__items).toHaveLength(2);
      expect(prisma.__items.every((r) => r.roomId === 'room-1')).toBe(true);
    });

    it('throws TRANSCRIPT_NOT_FOUND when room has no transcript', async () => {
      const transcriptService = createFakeTranscriptService([]);

      await expect(
        service.extractFromRoomId('room-empty', transcriptService as never),
      ).rejects.toThrow('No transcript found for room');
    });

    it('passes all transcript segments to extractActionItems', async () => {
      const segments = [
        makeSegment({ text: 'Task A' }),
        makeSegment({ text: 'Task B' }),
        makeSegment({ text: 'Task C' }),
      ];
      const transcriptService = createFakeTranscriptService(segments);
      ai.generateText.mockResolvedValue('Item 1');

      await service.extractFromRoomId('room-1', transcriptService as never);

      const prompt = ai.generateText.mock.calls[0]![0] as string;
      expect(prompt).toContain('Task A');
      expect(prompt).toContain('Task B');
      expect(prompt).toContain('Task C');
    });
  });

  describe('getActionItems', () => {
    it('returns empty array when no items extracted for room', async () => {
      const items = await service.getActionItems('room-nonexistent');
      expect(items).toEqual([]);
    });

    it('returns persisted items after extractFromRoomId', async () => {
      const segments = [makeSegment({ text: 'Do something' })];
      const transcriptService = createFakeTranscriptService(segments);
      ai.generateText.mockResolvedValue('Task 1\nTask 2');

      await service.extractFromRoomId('room-1', transcriptService as never);

      const items = await service.getActionItems('room-1');
      expect(items).toHaveLength(2);
      expect(items[0]!.title).toBe('Task 1');
    });

    it('is room-scoped (does not return items from other rooms)', async () => {
      ai.generateText.mockResolvedValue('Task A');
      await service.extractFromRoomId(
        'room-1',
        createFakeTranscriptService([makeSegment()]) as never,
      );
      await service.extractFromRoomId(
        'room-2',
        createFakeTranscriptService([makeSegment()]) as never,
      );

      const items = await service.getActionItems('room-1');
      expect(items).toHaveLength(1);
    });
  });

  describe('completeActionItem', () => {
    it('marks a persisted action item as completed', async () => {
      const segments = [makeSegment({ text: 'Fix the bug' })];
      const transcriptService = createFakeTranscriptService(segments);
      ai.generateText.mockResolvedValue('Fix the bug');

      const items = await service.extractFromRoomId('room-1', transcriptService as never);
      const itemId = items[0]!.id;

      const completed = await service.completeActionItem(itemId, 'user-1');

      expect(completed.status).toBe('completed');
      expect(completed.id).toBe(itemId);

      // Persisted update is reflected on subsequent reads.
      const reloaded = await service.getActionItems('room-1');
      expect(reloaded[0]!.status).toBe('completed');
    });

    it('throws ACTION_ITEM_NOT_FOUND for unknown id', async () => {
      await expect(service.completeActionItem('unknown-id', 'user-1')).rejects.toThrow(
        'Action item not found',
      );
    });
  });
});
