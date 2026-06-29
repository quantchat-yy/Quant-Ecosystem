// ============================================================================
// QuantTube - Channel Subscription Service (YouTube-style subscribe)
// ============================================================================
//
// Subscribe / unsubscribe to a channel, keeping VideoChannel.subscriberCount in
// sync. Idempotent on the unique (userId, channelId): re-subscribing or
// re-unsubscribing never double-counts. You cannot subscribe to your own
// channel. Backs the subscription feed (the channels a user follows).
//
// Injected narrow prisma surface so it is fully unit-testable with a mock.

import { createAppError } from '@quant/server-core';

export interface ChannelRow {
  id: string;
  userId: string;
  subscriberCount: number;
}

export interface SubscriptionRow {
  id: string;
  userId: string;
  channelId: string;
  createdAt: Date;
}

export interface SubscriptionPrisma {
  videoChannel: {
    findUnique: (args: { where: Record<string, unknown> }) => Promise<ChannelRow | null>;
    update: (args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }) => Promise<ChannelRow>;
  };
  videoChannelSubscription: {
    findUnique: (args: { where: Record<string, unknown> }) => Promise<SubscriptionRow | null>;
    create: (args: { data: Record<string, unknown> }) => Promise<SubscriptionRow>;
    delete: (args: { where: Record<string, unknown> }) => Promise<SubscriptionRow>;
    findMany: (args: Record<string, unknown>) => Promise<SubscriptionRow[]>;
    count: (args: Record<string, unknown>) => Promise<number>;
  };
}

export interface SubscriptionResult {
  subscribed: boolean;
  subscriberCount: number;
}

export class ChannelSubscriptionService {
  constructor(private readonly prisma: SubscriptionPrisma) {}

  private async requireChannel(channelId: string): Promise<ChannelRow> {
    const channel = await this.prisma.videoChannel.findUnique({ where: { id: channelId } });
    if (!channel) {
      throw createAppError('Channel not found', 404, 'CHANNEL_NOT_FOUND');
    }
    return channel;
  }

  /** Subscribe to a channel. Idempotent; never increments twice. */
  async subscribe(userId: string, channelId: string): Promise<SubscriptionResult> {
    const channel = await this.requireChannel(channelId);
    if (channel.userId === userId) {
      throw createAppError('You cannot subscribe to your own channel', 400, 'CANNOT_SUBSCRIBE_OWN');
    }

    const existing = await this.prisma.videoChannelSubscription.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    if (existing) {
      // Already subscribed — no double count.
      return { subscribed: true, subscriberCount: channel.subscriberCount };
    }

    await this.prisma.videoChannelSubscription.create({ data: { userId, channelId } });
    const updated = await this.prisma.videoChannel.update({
      where: { id: channelId },
      data: { subscriberCount: { increment: 1 } },
    });
    return { subscribed: true, subscriberCount: updated.subscriberCount };
  }

  /** Unsubscribe from a channel. Idempotent; never decrements below the count. */
  async unsubscribe(userId: string, channelId: string): Promise<SubscriptionResult> {
    const channel = await this.requireChannel(channelId);
    const existing = await this.prisma.videoChannelSubscription.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    if (!existing) {
      return { subscribed: false, subscriberCount: channel.subscriberCount };
    }

    await this.prisma.videoChannelSubscription.delete({
      where: { userId_channelId: { userId, channelId } },
    });
    // Guard against an underflow if the counter ever drifted.
    const nextCount = Math.max(0, channel.subscriberCount - 1);
    const updated = await this.prisma.videoChannel.update({
      where: { id: channelId },
      data: { subscriberCount: nextCount },
    });
    return { subscribed: false, subscriberCount: updated.subscriberCount };
  }

  async isSubscribed(userId: string, channelId: string): Promise<boolean> {
    const row = await this.prisma.videoChannelSubscription.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    return Boolean(row);
  }

  /** The channels a user subscribes to (newest first) — the subscription feed source. */
  async listSubscriptions(
    userId: string,
  ): Promise<Array<{ channelId: string; subscribedAt: Date }>> {
    const rows = await this.prisma.videoChannelSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ channelId: r.channelId, subscribedAt: r.createdAt }));
  }
}
