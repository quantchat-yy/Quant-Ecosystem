import type { FastifyInstance, FastifyRequest } from 'fastify';
import websocketPlugin, { type WebSocket } from '@fastify/websocket';
import Redis from 'ioredis';
import { ConnectionAuth, AuthError } from '@quant/realtime';
import { PresenceManager } from '@quant/realtime/presence';
import {
  InProcessBackplane,
  RedisRealtimeBackplane,
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

  const presence = new PresenceManager();
  const rooms = new Map<string, Set<WebSocket>>();
  const socketUsers = new Map<WebSocket, string>();

  // W2 — Cross-instance realtime fan-out (design Component 2 / Algorithm 4).
  // Select the backplane implementation here (Task 6.2): use the Redis pub/sub
  // backplane when REDIS_URL is configured, otherwise fall back to the no-op
  // single-node InProcessBackplane (the degraded-mode reconnect handling lands
  // in Task 8). The `rooms` map above remains this instance's LOCAL socket
  // registry; the backplane only carries events between instances.
  const redisUrl = process.env.REDIS_URL;
  let redis: Redis | null = null;
  let backplane: RealtimeBackplane;
  if (redisUrl) {
    redis = new Redis(redisUrl, { lazyConnect: false, maxRetriesPerRequest: null });
    redis.on('error', (err: Error) => {
      fastify.log.error({ err }, 'realtime backplane Redis connection error');
    });
    backplane = new RedisRealtimeBackplane(redis);
  } else {
    backplane = new InProcessBackplane();
  }

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
    const room = rooms.get(conversationId);
    if (!room) return;
    const data = JSON.stringify(event.payload);
    for (const client of room) {
      if (client.readyState === client.OPEN) {
        client.send(data);
      }
    }
  });

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
      presence.setOnline(userId, 'quantchat');

      const query = request.query as { conversationId?: string };
      if (query.conversationId) {
        if (joinRoom(query.conversationId, socket)) {
          ensureSubscribed(query.conversationId);
        }
      }

      socket.on('message', (rawData: Buffer | string) => {
        try {
          const message = JSON.parse(rawData.toString());

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
        presence.setOffline(userId);
      });
    },
  );

  fastify.get('/presence', async () => {
    return { online: presence.getOnlineInApp('quantchat') };
  });
}
