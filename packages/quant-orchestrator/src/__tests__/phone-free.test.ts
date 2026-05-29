import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PhoneFreeManager } from '../phone-free.js';
import type { QueuedAction, ActionResult } from '../types.js';

function makeAction(id: string): QueuedAction {
  return {
    id,
    intent: { type: 'tool', confidence: 0.8, rawTranscript: `action ${id}`, toolId: 'test' },
    enqueuedAt: Date.now(),
  };
}

describe('PhoneFreeManager - extended', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should dequeue actions in FIFO order', () => {
    const manager = new PhoneFreeManager();
    manager.enqueue(makeAction('first'));
    manager.enqueue(makeAction('second'));
    manager.enqueue(makeAction('third'));

    expect(manager.dequeue()!.id).toBe('first');
    expect(manager.dequeue()!.id).toBe('second');
    expect(manager.dequeue()!.id).toBe('third');
  });

  it('should continue processing queue when handler fails', async () => {
    const manager = new PhoneFreeManager();
    manager.enqueue(makeAction('a'));
    manager.enqueue(makeAction('b'));
    manager.enqueue(makeAction('c'));

    let callCount = 0;
    const handler = async (action: QueuedAction): Promise<ActionResult> => {
      callCount++;
      if (action.id === 'b') {
        throw new Error('Handler failure');
      }
      return { success: true, type: 'tool', data: { id: action.id } };
    };

    // processQueue does not try/catch per action, so it will throw on 'b'
    // but items before 'b' are already processed and shifted
    await expect(manager.processQueue(handler)).rejects.toThrow('Handler failure');
    expect(callCount).toBe(2);
    // 'a' was shifted and processed, 'b' was shifted then threw, 'c' remains
    expect(manager.getQueue()).toHaveLength(1);
    expect(manager.getQueue()[0]!.id).toBe('c');
  });

  it('should return undefined when dequeuing from empty queue', () => {
    const manager = new PhoneFreeManager();
    expect(manager.dequeue()).toBeUndefined();
  });

  it('should return a copy from getQueue so mutations do not affect internal state', () => {
    const manager = new PhoneFreeManager();
    manager.enqueue(makeAction('x'));
    manager.enqueue(makeAction('y'));

    const queue = manager.getQueue();
    queue.pop();
    queue.pop();

    expect(manager.getQueue()).toHaveLength(2);
  });

  it('should auto-deactivate after session timeout', () => {
    const manager = new PhoneFreeManager({ sessionTimeoutMs: 5000 });
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    manager.enter();
    expect(manager.isActive()).toBe(true);

    vi.advanceTimersByTime(5001);
    expect(manager.isActive()).toBe(false);
  });

  it('should reset activity timestamp on enter()', () => {
    const manager = new PhoneFreeManager({ sessionTimeoutMs: 5000 });
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    manager.enter();

    vi.advanceTimersByTime(4000);
    expect(manager.isActive()).toBe(true);

    // Re-enter to reset the activity timestamp
    manager.enter();
    vi.advanceTimersByTime(4000);
    expect(manager.isActive()).toBe(true);

    vi.advanceTimersByTime(2000);
    expect(manager.isActive()).toBe(false);
  });
});
