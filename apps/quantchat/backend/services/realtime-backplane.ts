// ============================================================================
// QuantChat — RealtimeBackplane (W2, design Component 2)
// ============================================================================
//
// Decouples "which socket is in which room" from "which instance hosts the
// socket". Each backend instance keeps its LOCAL room map (the sockets it
// owns) but subscribes to a shared pub/sub channel per conversation. Publishing
// a room event broadcasts it to every subscribed instance, which then fans it
// out to its own local sockets (design Algorithm 4, wired in Task 6.2).
//
// Two implementations sit behind the same interface:
//  - RedisRealtimeBackplane: ioredis pub/sub, one channel per conversation
//    (the default when REDIS_URL is configured).
//  - InProcessBackplane: a no-op single-node fallback for local dev / tests
//    where same-instance delivery already happens at publish time.
//
// Each process is assigned a unique Instance_Id, stamped onto every published
// event so the originating instance can suppress duplicate local delivery
// (de-dup, used by the websocket wiring in Task 6.2 — Requirement 4.4).
// ============================================================================

import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';

/**
 * The set of room event types fanned across the cluster. Mirrors the event
 * `type` values already produced by the websocket layer (`new_message`,
 * `typing_indicator`) plus the delivery/presence events introduced by W2/W3.
 */
export type RoomEventType = 'new_message' | 'typing_indicator' | 'message:read' | 'presence:update';

/**
 * A room event as it travels over the backplane. `originInstanceId` identifies
 * the publishing instance so peers can tell a locally-originated echo apart
 * from a genuine remote event and avoid double-delivering (Requirement 4.4).
 */
export interface RoomEvent {
  type: RoomEventType;
  /** De-dupe: ignore events this instance published (set by {@link RealtimeBackplane.publish}). */
  originInstanceId: string;
  payload: unknown;
}

/** Handler invoked with each inbound backplane event for a conversation. */
export type RoomEventHandler = (conversationId: string, event: RoomEvent) => void;

/**
 * Cross-instance realtime fan-out contract (design Component 2). Implementations
 * maintain this instance's subscriptions to active conversation channels and
 * relay published events to every subscribed instance.
 */
export interface RealtimeBackplane {
  /** Unique id for this process; stamped onto published events for de-dup. */
  readonly instanceId: string;
  /** Subscribe this instance to a conversation channel (idempotent). */
  subscribe(conversationId: string): Promise<void>;
  /** Unsubscribe when no local sockets remain in the room. */
  unsubscribe(conversationId: string): Promise<void>;
  /** Publish an event to all instances subscribed to the channel. */
  publish(conversationId: string, event: RoomEvent): Promise<void>;
  /** Register the handler that fans an inbound backplane event to local sockets. */
  onMessage(handler: RoomEventHandler): void;
  /** Graceful shutdown — used by the existing onClose hook. */
  shutdown(): Promise<void>;
}

/** Prefix for the per-conversation pub/sub channel names. */
const CHANNEL_PREFIX = 'quantchat:room:';

/** Build the pub/sub channel name for a conversation. */
function channelFor(conversationId: string): string {
  return `${CHANNEL_PREFIX}${conversationId}`;
}

/** Extract the conversation id from a pub/sub channel name. */
function conversationFromChannel(channel: string): string | null {
  if (!channel.startsWith(CHANNEL_PREFIX)) return null;
  return channel.slice(CHANNEL_PREFIX.length);
}

/**
 * Generate a unique per-process Instance_Id (Requirement 4.4). A human-readable
 * prefix keeps logs/diagnostics legible while the random suffix guarantees
 * uniqueness across replicas of the same image.
 */
export function createInstanceId(): string {
  return `quantchat-${randomUUID()}`;
}

/**
 * Redis-backed realtime backplane (default). Uses one ioredis pub/sub channel
 * per conversation. A dedicated subscriber connection is duplicated from the
 * supplied client because ioredis connections in subscriber mode cannot also
 * issue ordinary commands (e.g. PUBLISH).
 */
export class RedisRealtimeBackplane implements RealtimeBackplane {
  readonly instanceId: string;

  /** Connection used for PUBLISH (and SUBSCRIBE bookkeeping commands). */
  private readonly pub: Redis;
  /** Dedicated connection placed into subscriber mode. */
  private readonly sub: Redis;
  /** Channels this instance is currently subscribed to (drives idempotency + resubscribe). */
  private readonly subscribed = new Set<string>();
  private handler: RoomEventHandler | null = null;
  private listening = false;

  constructor(redis: Redis, instanceId: string = createInstanceId()) {
    this.instanceId = instanceId;
    this.pub = redis;
    // A separate connection is required for subscriber mode.
    this.sub = redis.duplicate();
  }

  /**
   * Subscribe this instance to a conversation channel. Idempotent: a repeat
   * call for an already-subscribed conversation is a no-op (Requirement 4.1).
   */
  async subscribe(conversationId: string): Promise<void> {
    this.ensureListening();
    const channel = channelFor(conversationId);
    if (this.subscribed.has(channel)) return;
    this.subscribed.add(channel);
    await this.sub.subscribe(channel);
  }

  /**
   * Unsubscribe this instance from a conversation channel once the last local
   * socket has left the room (Requirement 4.2).
   */
  async unsubscribe(conversationId: string): Promise<void> {
    const channel = channelFor(conversationId);
    if (!this.subscribed.has(channel)) return;
    this.subscribed.delete(channel);
    await this.sub.unsubscribe(channel);
  }

  /**
   * Publish a room event to every instance subscribed to the conversation
   * channel (Requirement 4.3). The event is stamped with this instance's
   * Instance_Id so the origin can later suppress duplicate local delivery.
   */
  async publish(conversationId: string, event: RoomEvent): Promise<void> {
    const stamped: RoomEvent = { ...event, originInstanceId: this.instanceId };
    await this.pub.publish(channelFor(conversationId), JSON.stringify(stamped));
  }

  /**
   * Register the single handler that fans inbound backplane events out to local
   * sockets (Requirements 4.4, 4.5 — the de-dup/fan-out decision lives in the
   * handler wired by Task 6.2).
   */
  onMessage(handler: RoomEventHandler): void {
    this.handler = handler;
    this.ensureListening();
  }

  /** Tear down both connections (called from the existing onClose hook). */
  async shutdown(): Promise<void> {
    try {
      await this.sub.unsubscribe();
    } catch {
      // best-effort — connection may already be closing
    }
    this.subscribed.clear();
    this.sub.disconnect();
    // The `pub` connection is owned by the caller (shared app-wide Redis client),
    // so it is not disconnected here.
  }

  /** Attach the ioredis `message` listener exactly once. */
  private ensureListening(): void {
    if (this.listening) return;
    this.listening = true;
    this.sub.on('message', (channel: string, message: string) => {
      this.dispatch(channel, message);
    });
  }

  /** Parse an inbound pub/sub message and forward it to the registered handler. */
  private dispatch(channel: string, message: string): void {
    if (!this.handler) return;
    const conversationId = conversationFromChannel(channel);
    if (conversationId === null) return;

    let event: RoomEvent;
    try {
      event = JSON.parse(message) as RoomEvent;
    } catch {
      // Drop malformed payloads rather than crash the subscriber.
      return;
    }

    this.handler(conversationId, event);
  }
}

/**
 * No-op single-node fallback (design Component 2). Used for local dev / tests
 * and as the degraded mode when no backplane is configured. In single-node
 * operation, same-instance delivery already happens synchronously in the
 * websocket layer at publish time, so there is nothing to fan out across
 * instances — every method is intentionally a no-op.
 */
export class InProcessBackplane implements RealtimeBackplane {
  readonly instanceId: string;
  private handler: RoomEventHandler | null = null;

  constructor(instanceId: string = createInstanceId()) {
    this.instanceId = instanceId;
  }

  async subscribe(_conversationId: string): Promise<void> {
    // No cross-instance channel exists in single-node mode.
  }

  async unsubscribe(_conversationId: string): Promise<void> {
    // No cross-instance channel exists in single-node mode.
  }

  async publish(_conversationId: string, _event: RoomEvent): Promise<void> {
    // Same-instance sockets are served directly by the websocket layer; there
    // are no peer instances to forward to.
  }

  onMessage(handler: RoomEventHandler): void {
    // Retained for interface parity; never invoked without a remote source.
    this.handler = handler;
  }

  async shutdown(): Promise<void> {
    this.handler = null;
  }
}
