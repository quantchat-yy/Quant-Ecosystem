import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChannelSubscriptionService } from '../services/subscription.service';

function createMockPrisma(channel = { id: 'ch1', userId: 'creator', subscriberCount: 10 }) {
  const subs = new Map<
    string,
    { id: string; userId: string; channelId: string; createdAt: Date }
  >();
  let n = 0;
  const key = (w: any) => `${w.userId_channelId.userId}|${w.userId_channelId.channelId}`;
  const ch = { ...channel };
  return {
    _channel: ch,
    _subs: subs,
    videoChannel: {
      findUnique: vi.fn(async ({ where }: any) => (where.id === ch.id ? { ...ch } : null)),
      update: vi.fn(async ({ data }: any) => {
        if (typeof data.subscriberCount === 'object' && data.subscriberCount.increment) {
          ch.subscriberCount += data.subscriberCount.increment;
        } else if (typeof data.subscriberCount === 'number') {
          ch.subscriberCount = data.subscriberCount;
        }
        return { ...ch };
      }),
    },
    videoChannelSubscription: {
      findUnique: vi.fn(async ({ where }: any) => subs.get(key(where)) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const row = {
          id: `s-${++n}`,
          userId: data.userId,
          channelId: data.channelId,
          createdAt: new Date(),
        };
        subs.set(`${data.userId}|${data.channelId}`, row);
        return { ...row };
      }),
      delete: vi.fn(async ({ where }: any) => {
        const k = key(where);
        const row = subs.get(k)!;
        subs.delete(k);
        return row;
      }),
      findMany: vi.fn(async ({ where }: any) =>
        [...subs.values()].filter((r) => r.userId === where.userId),
      ),
      count: vi.fn(async () => subs.size),
    },
  };
}

describe('ChannelSubscriptionService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: ChannelSubscriptionService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new ChannelSubscriptionService(prisma as never);
  });

  it('subscribes and increments the subscriber count', async () => {
    const res = await service.subscribe('viewer', 'ch1');
    expect(res.subscribed).toBe(true);
    expect(res.subscriberCount).toBe(11);
  });

  it('is idempotent: subscribing twice does not double-count', async () => {
    await service.subscribe('viewer', 'ch1');
    const again = await service.subscribe('viewer', 'ch1');
    expect(again.subscribed).toBe(true);
    expect(again.subscriberCount).toBe(11);
    expect(prisma._channel.subscriberCount).toBe(11);
  });

  it('blocks subscribing to your own channel', async () => {
    await expect(service.subscribe('creator', 'ch1')).rejects.toMatchObject({
      code: 'CANNOT_SUBSCRIBE_OWN',
    });
  });

  it('404s an unknown channel', async () => {
    await expect(service.subscribe('viewer', 'ghost')).rejects.toMatchObject({
      code: 'CHANNEL_NOT_FOUND',
    });
  });

  it('unsubscribes and decrements; idempotent when not subscribed', async () => {
    await service.subscribe('viewer', 'ch1'); // 11
    const off = await service.unsubscribe('viewer', 'ch1'); // 10
    expect(off.subscribed).toBe(false);
    expect(off.subscriberCount).toBe(10);
    // Unsubscribing again is a no-op.
    const again = await service.unsubscribe('viewer', 'ch1');
    expect(again.subscriberCount).toBe(10);
  });

  it('reports isSubscribed and lists subscriptions', async () => {
    await service.subscribe('viewer', 'ch1');
    expect(await service.isSubscribed('viewer', 'ch1')).toBe(true);
    expect(await service.isSubscribed('other', 'ch1')).toBe(false);
    const list = await service.listSubscriptions('viewer');
    expect(list.map((s) => s.channelId)).toEqual(['ch1']);
  });

  it('never decrements below zero on a drifted counter', async () => {
    const p = createMockPrisma({ id: 'ch1', userId: 'creator', subscriberCount: 0 });
    const svc = new ChannelSubscriptionService(p as never);
    // Force a stale subscription row without a positive count.
    p._subs.set('viewer|ch1', {
      id: 's',
      userId: 'viewer',
      channelId: 'ch1',
      createdAt: new Date(),
    });
    const off = await svc.unsubscribe('viewer', 'ch1');
    expect(off.subscriberCount).toBe(0);
  });
});
