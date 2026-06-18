import type { FastifyInstance, FastifyRequest } from 'fastify';
import websocketPlugin, { type WebSocket } from '@fastify/websocket';
import Redis from 'ioredis';
import { ConnectionAuth, AuthError } from '@quant/realtime';
import { PresenceManager } from '@quant/realtime/presence';
import {
  InProcessBackplane,
  RedisRealtimeBackplane,
  backplaneRetryStrategy,
  type RealtimeBackplane,
  type RoomEvent,
  type RoomEventType,
} from '../services/realtime-backplane';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be set to a value of at least 32 characters in production');
    }
    return secret;
  }
  if (!secret) {
    globalThis.console.warn(
      '[SECURITY] JWT_SECRET not set - using dev-only fallback. NEVER use in production.',
    );
    return 'dev-only-insecure-jwt-secret-not-for-production-use-000';
  }
  return secret;
}

export async function websocketRoutes(fastify: FastifyInstance) {
  await fastify.register(websocketPlugin);

  const auth = new ConnectionAuth({
    jwtSecret: getJwtSecret(),
    jwtIssuer: process.env.JWT_ISSUER || 'quantchat',
    jwtAudience: process.env.JWT_AUDIENCE || 'quant-ecosystem',
  });

  const rooms = new Map<string, Set<WebSocket>>();
  const socketUsers = new Map<WebSocket, string>();

  // W2 — Cross-instance realtime fan-out (design Component 2 / Algorithm 4).
  // Select the backplane implementation here (Task 6.2): use the Redis pub/sub
  // backplane when REDIS_URL is configured, otherwise fall back to the no-op
  // single-node InProcessBackplane. The `rooms` map above remains this
  // instance's LOCAL socket registry; the backplane only carries events between
  // instances.
  //
  // W2 — Degraded single-node fallback + reconnect (Task 8, design Error
  // Handling "Redis/NATS unavailable"). ioredis owns reconnection: a
  // `retryStrategy` with exponential backoff (1s → cap 30s — Requirement 6.2)
  // keeps retrying a downed Redis, while `maxRetriesPerRequest: null` prevents
  // individual commands from erroring out mid-outage. The RedisRealtimeBackplane
  // starts degraded until its first `ready`, re-subscribes every active
  // conversation channel AND the presence channel on (re)connect, and reports
  // its health via `isHealthy()` (surfaced on /healthz below). Throughout an
  // outage local delivery still happens at publish time (Requirement 6.3).
  const redisUrl = process.env.REDIS_URL;
  let redis: Redis | null = null;
  let backplane: RealtimeBackplane;
  if (redisUrl) {
    redis = new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: null,
      retryStrategy: (times: number) => backplaneRetryStrategy(times),
    });
    redis.on('error', (err: Error) => {
      fastify.log.error({ err }, 'realtime backplane Redis connection error');
    });
    const redisBackplane = new RedisRealtimeBackplane(redis);
    // Log degraded/healthy transitions so operators can see the backplane drop
    // into single-node mode and recover (design Error Handling table).
    redisBackplane.onHealthChange((healthy: boolean) => {
      if (healthy) {
        fastify.log.info('realtime backplane connected; cross-instance fan-out healthy');
      } else {
        fastify.log.warn(
          'realtime backplane disconnected; degraded to single-node mode (local delivery only)',
        );
      }
    });
    backplane = redisBackplane;
  } else {
    backplane = new InProcessBackplane();
  }

  // Surface backplane health on the shared /healthz endpoint (Requirement
  // 6.1/6.2). The contributor is evaluated per request, so it always reflects
  // the live connection state: `degraded` while a configured Redis backplane is
  // unreachable (single-node mode), `ok` once connected (or when running as a
  // deliberate single-node InProcessBackplane). Guarded so the route still works
  // if the host app's health plugin predates the contributor registry.
  const healthAware = fastify as unknown as {
    addHealthContributor?: (
      name: string,
      contributor: () => { status: 'ok' | 'degraded' | 'unavailable'; detail?: string },
    ) => void;
  };
  if (typeof healthAware.addHealthContributor === 'function') {
    healthAware.addHealthContributor('realtime-backplane', () =>
      backplane.isHealthy()
        ? { status: 'ok' }
        : {
            status: 'degraded',
            detail: 'realtime backplane unreachable; running in single-node mode',
          },
    );
  }

  // W2 — Presence backplane wiring (Task 7, design Component 2 note / Sequence 3).
  // The PresenceManager shares the SAME ioredis client as the RealtimeBackplane
  // when REDIS_URL is set, so presence is recorded/read via the shared Redis
  // ZSET (score = last-seen timestamp) and is therefore visible across every
  // instance (Requirement 5.1). With no Redis it transparently falls back to
  // in-memory single-node presence. A Redis read failure is logged so operators
  // can see the degraded state; `isOnlineAnywhere` then reports offline and the
  // delivery path falls back to push (Requirement 5.4).
  const presence = new PresenceManager(
    redis
      ? {
          redis,
          onReadFailure: (userId: string, err: unknown) => {
            fastify.log.error({ err, userId }, 'presence redis read failed; treating as offline');
          },
        }
      : {},
  );

  // Dedicated, cluster-wide channel carrying user presence transitions. Presence
  // is user-scoped rather than conversation-scoped, so it rides its own channel
  // (reusing the per-conversation backplane plumbing) instead of a room channel.
  const PRESENCE_CHANNEL = '__presence__';
  backplane.subscribe(PRESENCE_CHANNEL).catch((err: unknown) => {
    fastify.log.error({ err }, 'backplane presence subscribe failed');
  });

  /**
   * Algorithm 4 — cross-instance fan-out. Inbound backplane events whose origin
   * is THIS instance were already delivered to local sockets at publish time, so
   * they are discarded here to avoid double-delivery (Requirement 4.4). Genuine
   * remote events are forwarded to every open local socket in the room
   * (Requirement 4.5), guaranteeing each member socket receives the event
   * exactly once across the cluster (Requirement 4.6).
   */
  backplane.onMessage((conversationId: string, event: RoomEvent) => {
    if (event.originInstanceId === backplane.instanceId) return;
    // Presence transitions are user-scoped, not room-scoped: a remote instance
    // published it on the dedicated presence channel, so fan it out to every
    // open local socket (Requirement 5.3 — subscribed instances receive it; the
    // frontend re-renders affected indicators per Requirement 11.3).
    if (event.type === 'presence:update') {
      broadcastToAllSockets(event.payload);
      return;
    }
    const room = rooms.get(conversationId);
    if (!room) return;
    const data = JSON.stringify(event.payload);
    for (const client of room) {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    }
  });

  /** Send a payload to every open socket connected to THIS instance. */
  function broadcastToAllSockets(payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const socket of socketUsers.keys()) {
      if (socket.readyState === socket.OPEN) {
        socket.send(data);
      }
    }
  }

  /**
   * Publish a user's online/offline transition over the backplane so every
   * subscribed instance learns about it (Requirement 5.3), and deliver it to
   * this instance's own sockets immediately. Stamped with this instance's id so
   * the origin does not double-deliver when the event echoes back.
   */
  function publishPresence(userId: string, status: 'online' | 'offline'): void {
    const payload = { type: 'presence:update', userId, status, lastSeen: Date.now() };
    broadcastToAllSockets(payload);
    const event: RoomEvent = {
      type: 'presence:update',
      originInstanceId: backplane.instanceId,
      payload,
    };
    backplane.publish(PRESENCE_CHANNEL, event).catch((err: unknown) => {
      fastify.log.error({ err, userId }, 'backplane presence publish failed');
    });
  }

  /**
   * Add a socket to a conversation's local room. Returns true when this is the
   * first local socket for the conversation (i.e. the room did not previously
   * exist), which is the signal that this instance must subscribe to the
   * conversation channel on the backplane (Requirement 4.1).
   */
  function joinRoom(conversationId: string, socket: WebSocket): boolean {
    let room = rooms.get(conversationId);
    const isNewRoom = !room;
    if (!room) {
      room = new Set();
      rooms.set(conversationId, room);
    }
    room.add(socket);
    return isNewRoom;
  }

  /**
   * Subscribe this instance to a conversation channel the first time a local
   * socket joins the room (Requirement 4.1). Subscription is idempotent at the
   * backplane level, so a redundant call is harmless.
   */
  function ensureSubscribed(conversationId: string): void {
    backplane.subscribe(conversationId).catch((err: unknown) => {
      fastify.log.error({ err, conversationId }, 'backplane subscribe failed');
    });
  }

  /**
   * Deliver a room event to the local sockets AND publish it to the backplane so
   * peer instances can fan it out to their own sockets (Requirement 4.3). Local
   * delivery happens first so that — even if the backplane publish fails — the
   * sockets on this instance still receive the event (the publish-failure
   * retry/record path is completed in Task 8 / Requirement 4.7).
   */
  function publishRoomEvent(
    conversationId: string,
    type: RoomEventType,
    payload: unknown,
    exclude?: WebSocket,
  ): void {
    // 1. Local delivery (origin instance delivers at publish time).
    const room = rooms.get(conversationId);
    if (room) {
      const data = JSON.stringify(payload);
      for (const client of room) {
        if (client !== exclude && client.readyState === client.OPEN) {
          client.send(data);
        }
      }
    }

    // 2. Cross-instance fan-out — stamped with this instance's id by publish().
    const event: RoomEvent = {
      type,
      originInstanceId: backplane.instanceId,
      payload,
    };
    backplane.publish(conversationId, event).catch((err: unknown) => {
      fastify.log.error({ err, conversationId }, 'backplane publish failed');
    });
  }

  /**
   * Remove a socket from every room it belongs to. When a room becomes empty
   * (the last local socket left), unsubscribe this instance from the backplane
   * channel for that conversation (Requirement 4.2).
   */
  function leaveAllRooms(socket: WebSocket): void {
    for (const [conversationId, room] of rooms) {
      if (!room.delete(socket)) continue;
      if (room.size === 0) {
        rooms.delete(conversationId);
        backplane.unsubscribe(conversationId).catch((err: unknown) => {
          fastify.log.error({ err, conversationId }, 'backplane unsubscribe failed');
        });
      }
    }
  }

  // Tear down the backplane (and the Redis connection it was built on) when the
  // app closes, alongside the existing close hooks (Task 6.2 wiring).
  fastify.addHook('onClose', async () => {
    await backplane.shutdown();
    if (redis) {
      redis.disconnect();
    }
  });

  fastify.get(
    '/chat',
    {
      websocket: true,
      config: {
        rateLimit: {
          max: 20,
          timeWindow: '1 minute',
        },
      },
    },
    async (socket: WebSocket, request: FastifyRequest) => {
      let userId: string;
      try {
        const payload = await auth.authenticateUpgrade(request.raw);
        userId = payload.userId;
      } catch (error) {
        const code = error instanceof AuthError ? error.code : 4001;
        socket.send(JSON.stringify({ type: 'error', message: 'Authentication required' }));
        socket.close(code, 'Authentication required');
        return;
      }

      socketUsers.set(socket, userId);
      // Record presence in the shared ZSET (score = now). When this is the
      // first live device for the user, publish the online transition across
      // the cluster (Requirement 5.1, 5.3).
      if (presence.setOnline(userId, 'quantchat')) {
        publishPresence(userId, 'online');
      }

      const query = request.query as { conversationId?: string };
      if (query.conversationId) {
        if (joinRoom(query.conversationId, socket)) {
          ensureSubscribed(query.conversationId);
        }
      }

      socket.on('message', (rawData: Buffer | string) => {
        try {
          const message = JSON.parse(rawData.toString());

          // Any inbound activity refreshes the user's last-seen timestamp in the
          // shared ZSET so the 30s freshness window stays accurate while the
          // socket is alive (Requirement 5.2). Explicit heartbeat/ping frames
          // exist so idle-but-connected clients keep their presence fresh.
          presence.heartbeat(userId, 'quantchat');

          if (message.type === 'heartbeat' || message.type === 'ping') {
            return;
          }

          if (message.type === 'join_conversation' && typeof message.conversationId === 'string') {
            if (joinRoom(message.conversationId, socket)) {
              ensureSubscribed(message.conversationId);
            }
          }

          if (message.type === 'chat_message' && typeof message.conversationId === 'string') {
            publishRoomEvent(message.conversationId, 'new_message', {
              type: 'new_message',
              data: { ...message, senderId: userId },
            });
          }

          if (message.type === 'typing' && typeof message.conversationId === 'string') {
            publishRoomEvent(
              message.conversationId,
              'typing_indicator',
              {
                type: 'typing_indicator',
                userId,
                isTyping: Boolean(message.isTyping),
              },
              socket,
            );
          }
        } catch (err) {
          fastify.log.error({ err }, 'WebSocket message handling failed');
        }
      });

      socket.on('close', () => {
        leaveAllRooms(socket);
        socketUsers.delete(socket);
        // When the last live device disconnects, publish the offline transition
        // across the cluster (Requirement 5.3).
        if (presence.setOffline(userId)) {
          publishPresence(userId, 'offline');
        }
      });
    },
  );

  fastify.get('/presence', async () => {
    return { online: presence.getOnlineInApp('quantchat') };
  });
}
