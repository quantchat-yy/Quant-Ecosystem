import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VideoChatService } from '../services/video-chat.service';

function createMockPrisma() {
  return {
    videoChatSession: {
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
  };
}

describe('VideoChatService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let now: number;
  let idSeq: number;
  let service: VideoChatService;

  beforeEach(() => {
    prisma = createMockPrisma();
    now = 1_000_000;
    idSeq = 0;
    service = new VideoChatService(
      prisma as never,
      () => now,
      () => `sess-${++idSeq}`,
    );
  });

  it('queues the first caller and matches the second on overlapping interests', async () => {
    const first = await service.join('alice', { interests: ['Music', 'Gaming'] });
    expect(first).toEqual({ status: 'waiting' });

    const second = await service.join('bob', { interests: ['gaming', 'art'] });
    expect(second.status).toBe('matched');
    if (second.status === 'matched') {
      expect(second.session.participants).toEqual(['alice', 'bob']);
      expect(second.session.matchedInterests).toEqual(['gaming']);
    }
    expect(prisma.videoChatSession.create).toHaveBeenCalledTimes(1);
  });

  it('matches via the General bucket when one side has no interests', async () => {
    await service.join('alice', {});
    const r = await service.join('bob', { interests: ['cooking'] });
    expect(r.status).toBe('matched');
    if (r.status === 'matched') expect(r.session.matchedInterests).toEqual(['general']);
  });

  it('does NOT match when both have interests but none overlap', async () => {
    await service.join('alice', { interests: ['music'] });
    const r = await service.join('bob', { interests: ['sports'] });
    expect(r).toEqual({ status: 'waiting' });
    expect(prisma.videoChatSession.create).not.toHaveBeenCalled();
  });

  it('returns the existing session when an already-matched user re-joins', async () => {
    await service.join('alice', { interests: ['x'] });
    const m = await service.join('bob', { interests: ['x'] });
    const again = await service.join('alice', { interests: ['x'] });
    expect(again.status).toBe('matched');
    if (again.status === 'matched' && m.status === 'matched') {
      expect(again.session.id).toBe(m.session.id);
    }
    // No second session row created.
    expect(prisma.videoChatSession.create).toHaveBeenCalledTimes(1);
  });

  it('end records the session with a computed duration and frees both users', async () => {
    await service.join('alice', { interests: ['x'] });
    await service.join('bob', { interests: ['x'] });
    now += 5000; // 5s later

    const res = await service.end('alice');
    expect(res).toEqual({ ended: true });
    expect(prisma.videoChatSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ENDED', durationSec: 5 }),
      }),
    );
    // Both users are now free; alice has no active session.
    expect(service.getActiveSession('alice')).toBeNull();
    expect(service.getActiveSession('bob')).toBeNull();
  });

  it('end is a no-op when the user has no session', async () => {
    const res = await service.end('nobody');
    expect(res).toEqual({ ended: false });
    expect(prisma.videoChatSession.update).not.toHaveBeenCalled();
  });

  it('skip ends the current session and re-queues the caller', async () => {
    await service.join('alice', { interests: ['x'] });
    await service.join('bob', { interests: ['x'] }); // alice+bob matched

    const skipped = await service.skip('alice'); // no other waiting -> waiting
    expect(skipped).toEqual({ status: 'waiting' });
    // The skipped session was recorded.
    expect(prisma.videoChatSession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SKIPPED' }) }),
    );
  });

  it('carries text-fallback when either party enabled it', async () => {
    await service.join('alice', { interests: ['x'], enableTextFallback: true });
    const r = await service.join('bob', { interests: ['x'] });
    if (r.status === 'matched') expect(r.session.hasTextFallback).toBe(true);
  });
});
