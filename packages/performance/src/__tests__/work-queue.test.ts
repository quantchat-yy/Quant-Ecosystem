import { describe, it, expect, beforeEach } from 'vitest';
import { WorkQueueManager } from '../work-queue.js';

describe('WorkQueueManager', () => {
  let manager: WorkQueueManager;

  beforeEach(() => {
    manager = new WorkQueueManager();
  });

  it('defines a job type', () => {
    manager.defineJob('email', async () => {}, { maxRetries: 5 });
    expect(manager.getJobNames()).toContain('email');
  });

  it('enqueues a job', () => {
    manager.defineJob('email', async () => {});
    const job = manager.enqueue('email', { to: 'user@example.com' });

    expect(job.id).toBeDefined();
    expect(job.name).toBe('email');
    expect(job.status).toBe('waiting');
    expect(job.data).toEqual({ to: 'user@example.com' });
  });

  it('throws when enqueueing undefined job', () => {
    expect(() => manager.enqueue('undefined-job', {})).toThrow('Job not defined: undefined-job');
  });

  it('processes jobs successfully', async () => {
    const processed: string[] = [];
    manager.defineJob<{ msg: string }>('task', async (data) => {
      processed.push(data.msg);
    });

    manager.enqueue('task', { msg: 'hello' });
    const job = await manager.processNext('task');

    expect(job).not.toBeNull();
    expect(job!.status).toBe('completed');
    expect(processed).toEqual(['hello']);
  });

  it('retries failed jobs up to maxRetries', async () => {
    let attempts = 0;
    manager.defineJob(
      'flaky',
      async () => {
        attempts++;
        throw new Error('Transient failure');
      },
      { maxRetries: 3 },
    );

    manager.enqueue('flaky', {});

    // First attempt
    const job1 = await manager.processNext('flaky');
    expect(job1!.status).toBe('waiting');
    expect(job1!.attempts).toBe(1);

    // Second attempt
    await manager.processNext('flaky');
    expect(attempts).toBe(2);

    // Third attempt - should go to dead letter
    const job3 = await manager.processNext('flaky');
    expect(job3!.status).toBe('dead-letter');
    expect(attempts).toBe(3);
  });

  it('moves failed jobs to dead letter queue', async () => {
    manager.defineJob(
      'failing',
      async () => {
        throw new Error('permanent failure');
      },
      { maxRetries: 1 },
    );

    manager.enqueue('failing', { data: 'test' });
    await manager.processNext('failing');

    const dlq = manager.getDeadLetterQueue('failing');
    expect(dlq).toHaveLength(1);
    expect(dlq[0].error).toBe('permanent failure');
  });

  it('processes jobs by priority (higher first)', async () => {
    const order: number[] = [];
    manager.defineJob<{ priority: number }>('ordered', async (data) => {
      order.push(data.priority);
    });

    manager.enqueue('ordered', { priority: 1 }, 1);
    manager.enqueue('ordered', { priority: 3 }, 3);
    manager.enqueue('ordered', { priority: 2 }, 2);

    await manager.processNext('ordered');
    await manager.processNext('ordered');
    await manager.processNext('ordered');

    expect(order).toEqual([3, 2, 1]);
  });

  it('returns null when no jobs to process', async () => {
    manager.defineJob('empty', async () => {});
    const result = await manager.processNext('empty');
    expect(result).toBeNull();
  });

  it('returns queue metrics', async () => {
    manager.defineJob('counted', async () => {});
    manager.enqueue('counted', {});
    manager.enqueue('counted', {});
    await manager.processNext('counted');

    const metrics = manager.getMetrics('counted');
    expect(metrics.totalJobs).toBe(2);
    expect(metrics.completed).toBe(1);
    expect(metrics.waiting).toBe(1);
  });

  it('returns aggregate metrics', () => {
    manager.defineJob('a', async () => {});
    manager.defineJob('b', async () => {});
    manager.enqueue('a', {});
    manager.enqueue('b', {});

    const metrics = manager.getMetrics();
    expect(metrics.totalJobs).toBe(2);
    expect(metrics.waiting).toBe(2);
  });
});
