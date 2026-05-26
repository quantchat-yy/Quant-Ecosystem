import { describe, it, expect } from 'vitest';
import { DeliveryQueue, DeliveryJobSchema } from './delivery-queue.js';

describe('DeliveryQueue', () => {
  it('job enqueues with correct schema validation', () => {
    const queue = new DeliveryQueue();

    queue.enqueue({
      activityId: 'act-1',
      recipientInbox: 'https://remote.example/inbox',
      payload: '{"type":"Create"}',
      attempt: 0,
      maxAttempts: 5,
    });

    expect(queue.size()).toBe(1);
    expect(queue.getPendingJobs()[0]!.activityId).toBe('act-1');

    const parsed = DeliveryJobSchema.safeParse(queue.getPendingJobs()[0]);
    expect(parsed.success).toBe(true);
  });

  it('backoff calculates correctly (1s, 2s, 4s, 8s...)', () => {
    const queue = new DeliveryQueue();

    expect(queue.calculateBackoff(0)).toBe(1000);
    expect(queue.calculateBackoff(1)).toBe(2000);
    expect(queue.calculateBackoff(2)).toBe(4000);
    expect(queue.calculateBackoff(3)).toBe(8000);
    expect(queue.calculateBackoff(4)).toBe(16000);
  });

  it('max attempts respected (job dropped after max)', () => {
    const queue = new DeliveryQueue();

    queue.enqueue({
      activityId: 'act-fail',
      recipientInbox: 'https://remote.example/inbox',
      payload: '{"type":"Create"}',
      attempt: 4,
      maxAttempts: 5,
    });

    queue.processNext(() => false);

    expect(queue.size()).toBe(0);
    expect(queue.getFailedJobs()).toHaveLength(1);
    expect(queue.getFailedJobs()[0]!.activityId).toBe('act-fail');
  });

  it('failed delivery re-enqueues with incremented attempt', () => {
    const queue = new DeliveryQueue();

    queue.enqueue({
      activityId: 'act-retry',
      recipientInbox: 'https://remote.example/inbox',
      payload: '{"type":"Create"}',
      attempt: 0,
      maxAttempts: 5,
    });

    queue.processNext(() => false);

    expect(queue.size()).toBe(1);
    const pending = queue.getPendingJobs();
    expect(pending[0]!.attempt).toBe(1);
    expect(pending[0]!.activityId).toBe('act-retry');
  });
});
