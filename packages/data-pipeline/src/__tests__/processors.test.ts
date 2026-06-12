import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsProcessor } from '../processors/analytics-processor.js';
import {
  NotificationProcessor,
  type NotificationMessage,
  type UserPreferences,
} from '../processors/notification-processor.js';
import { IndexingProcessor, type IndexOperation } from '../processors/indexing-processor.js';
import type { StreamEvent } from '../types.js';

function createEvent(overrides: Partial<StreamEvent> = {}): StreamEvent {
  return {
    id: 'evt-1',
    type: 'page_view',
    source: 'web',
    timestamp: 1000000,
    data: {},
    ...overrides,
  };
}

describe('AnalyticsProcessor', () => {
  let processor: AnalyticsProcessor;

  beforeEach(() => {
    processor = new AnalyticsProcessor({
      bucketIntervalMs: 60000,
    });
  });

  it('should aggregate page_view events into time buckets', async () => {
    const events = [
      createEvent({ id: 'e1', type: 'page_view', timestamp: 1000000, data: {} }),
      createEvent({ id: 'e2', type: 'page_view', timestamp: 1010000, data: {} }),
      createEvent({ id: 'e3', type: 'click', timestamp: 1000000, data: {} }),
    ];

    await processor.process(events);
    const buckets = processor.getBuckets();

    expect(buckets.size).toBe(2);
    const pageViewBucket = buckets.get('page_view:960000');
    expect(pageViewBucket).toBeDefined();
    expect(pageViewBucket!.count).toBe(2);
  });

  it('should handle session events', async () => {
    const events = [
      createEvent({ id: 'e1', type: 'session_start', timestamp: 1000000 }),
      createEvent({ id: 'e2', type: 'session_end', timestamp: 1000000 }),
    ];

    await processor.process(events);
    const buckets = processor.getBuckets();

    expect(buckets.has('session_start:960000')).toBe(true);
    expect(buckets.has('session_end:960000')).toBe(true);
  });

  it('should ignore unknown event types', async () => {
    const events = [createEvent({ id: 'e1', type: 'unknown_type', timestamp: 1000000 })];

    await processor.process(events);
    expect(processor.getBuckets().size).toBe(0);
  });

  it('should call onFlush when buckets are stale', async () => {
    const onFlush = vi.fn().mockResolvedValue(undefined);
    const proc = new AnalyticsProcessor({
      bucketIntervalMs: 1, // very short for testing
      onFlush,
    });

    await proc.process([createEvent({ timestamp: 1 })]);
    // Wait for the bucket to be "stale"
    await new Promise((r) => setTimeout(r, 10));
    await proc.process([createEvent({ id: 'e2', timestamp: 2 })]);

    expect(onFlush).toHaveBeenCalled();
  });

  it('should reset buckets', async () => {
    await processor.process([createEvent()]);
    expect(processor.getBuckets().size).toBeGreaterThan(0);

    processor.reset();
    expect(processor.getBuckets().size).toBe(0);
  });
});

describe('NotificationProcessor', () => {
  let deliver: ReturnType<typeof vi.fn<(notifications: NotificationMessage[]) => Promise<void>>>;
  let getPreferences: ReturnType<typeof vi.fn<(userId: string) => Promise<UserPreferences | null>>>;
  let processor: NotificationProcessor;

  beforeEach(() => {
    deliver = vi
      .fn<(notifications: NotificationMessage[]) => Promise<void>>()
      .mockResolvedValue(undefined);
    getPreferences = vi
      .fn<(userId: string) => Promise<UserPreferences | null>>()
      .mockResolvedValue({ channels: ['email', 'push'] });
    processor = new NotificationProcessor({
      batchSize: 2,
      getPreferences,
      deliver,
    });
  });

  it('should process notification events and buffer them', async () => {
    const events = [
      createEvent({
        id: 'n1',
        type: 'notification',
        data: { userId: 'u1', title: 'Hello', body: 'World', channel: 'email' },
      }),
    ];

    await processor.process(events);
    expect(processor.getBufferSize()).toBe(1);
    expect(deliver).not.toHaveBeenCalled();
  });

  it('should deliver when batch size is reached', async () => {
    const events = [
      createEvent({
        id: 'n1',
        type: 'notification',
        data: { userId: 'u1', title: 'Hello', body: 'World' },
      }),
      createEvent({
        id: 'n2',
        type: 'notification',
        data: { userId: 'u2', title: 'Hi', body: 'There' },
      }),
    ];

    await processor.process(events);
    expect(deliver).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: 'u1', title: 'Hello' }),
        expect.objectContaining({ userId: 'u2', title: 'Hi' }),
      ]),
    );
  });

  it('should respect user preferences (disabled)', async () => {
    getPreferences.mockResolvedValue({ channels: [], disabled: true });

    const events = [
      createEvent({
        id: 'n1',
        type: 'notification',
        data: { userId: 'u1', title: 'Hello', body: 'World' },
      }),
    ];

    await processor.process(events);
    expect(processor.getBufferSize()).toBe(0);
  });

  it('should respect channel preferences', async () => {
    getPreferences.mockResolvedValue({ channels: ['push'] });

    const events = [
      createEvent({
        id: 'n1',
        type: 'notification',
        data: { userId: 'u1', title: 'Hello', body: 'World', channel: 'email' },
      }),
    ];

    await processor.process(events);
    expect(processor.getBufferSize()).toBe(0);
  });

  it('should skip events without required fields', async () => {
    const events = [
      createEvent({ id: 'n1', type: 'notification', data: { userId: 'u1' } }), // missing title/body
    ];

    await processor.process(events);
    expect(processor.getBufferSize()).toBe(0);
  });

  it('should ignore non-notification events', async () => {
    const events = [
      createEvent({ id: 'e1', type: 'page_view', data: { userId: 'u1', title: 't', body: 'b' } }),
    ];

    await processor.process(events);
    expect(processor.getBufferSize()).toBe(0);
  });
});

describe('IndexingProcessor', () => {
  let onBulkIndex: ReturnType<typeof vi.fn<(operations: IndexOperation[]) => Promise<void>>>;
  let processor: IndexingProcessor;

  beforeEach(() => {
    onBulkIndex = vi
      .fn<(operations: IndexOperation[]) => Promise<void>>()
      .mockResolvedValue(undefined);
    processor = new IndexingProcessor({
      bulkSize: 3,
      flushIntervalMs: 60000,
      onBulkIndex,
    });
  });

  it('should buffer index operations', async () => {
    const events = [
      createEvent({
        id: 'i1',
        type: 'index',
        data: {
          action: 'index',
          collection: 'posts',
          documentId: 'doc-1',
          document: { title: 'Hello' },
        },
      }),
    ];

    await processor.process(events);
    expect(processor.getBufferSize()).toBe(1);
    expect(onBulkIndex).not.toHaveBeenCalled();
  });

  it('should flush when bulk size is reached', async () => {
    const events = [
      createEvent({
        id: 'i1',
        type: 'index',
        data: { action: 'index', collection: 'posts', documentId: 'd1', document: {} },
      }),
      createEvent({
        id: 'i2',
        type: 'index',
        data: { action: 'update', collection: 'posts', documentId: 'd2', document: {} },
      }),
      createEvent({
        id: 'i3',
        type: 'index',
        data: { action: 'delete', collection: 'posts', documentId: 'd3' },
      }),
    ];

    await processor.process(events);
    expect(onBulkIndex).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ action: 'index', documentId: 'd1' }),
        expect.objectContaining({ action: 'update', documentId: 'd2' }),
        expect.objectContaining({ action: 'delete', documentId: 'd3' }),
      ]),
    );
  });

  it('should skip events with invalid action', async () => {
    const events = [
      createEvent({
        id: 'i1',
        type: 'index',
        data: { action: 'invalid', collection: 'posts', documentId: 'd1' },
      }),
    ];

    await processor.process(events);
    expect(processor.getBufferSize()).toBe(0);
  });

  it('should skip events missing required fields', async () => {
    const events = [
      createEvent({ id: 'i1', type: 'index', data: { action: 'index' } }), // missing collection, documentId
    ];

    await processor.process(events);
    expect(processor.getBufferSize()).toBe(0);
  });

  it('should not include document for delete operations', async () => {
    const events = [
      createEvent({
        id: 'i1',
        type: 'index',
        data: {
          action: 'delete',
          collection: 'posts',
          documentId: 'd1',
          document: { stale: true },
        },
      }),
      createEvent({
        id: 'i2',
        type: 'index',
        data: { action: 'index', collection: 'posts', documentId: 'd2', document: { title: 'hi' } },
      }),
      createEvent({
        id: 'i3',
        type: 'index',
        data: { action: 'index', collection: 'posts', documentId: 'd3', document: { title: 'yo' } },
      }),
    ];

    await processor.process(events);

    const ops = onBulkIndex.mock.calls[0]![0] as any[];
    const deleteOp = ops.find((o: any) => o.action === 'delete');
    expect(deleteOp?.document).toBeUndefined();
  });

  it('should flush buffer explicitly', async () => {
    const events = [
      createEvent({
        id: 'i1',
        type: 'index',
        data: { action: 'index', collection: 'x', documentId: 'd1', document: {} },
      }),
    ];

    await processor.process(events);
    await processor.flush();
    expect(onBulkIndex).toHaveBeenCalled();
    expect(processor.getBufferSize()).toBe(0);
  });
});
