import type { FastifyInstance, FastifyRequest } from 'fastify';
import websocketPlugin, { type WebSocket } from '@fastify/websocket';
import { ConnectionAuth, AuthError } from '@quant/realtime';
import { PresenceManager } from '@quant/realtime/presence';

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

  function joinRoom(conversationId: string, socket: WebSocket): void {
    let room = rooms.get(conversationId);
    if (!room) {
      room = new Set();
      rooms.set(conversationId, room);
    }
    room.add(socket);
  }

  function broadcastToRoom(conversationId: string, payload: unknown, exclude?: WebSocket): void {
    const room = rooms.get(conversationId);
    if (!room) return;
    const data = JSON.stringify(payload);
    for (const client of room) {
      if (client !== exclude && client.readyState === client.OPEN) {
        client.send(data);
      }
    }
  }

  function leaveAllRooms(socket: WebSocket): void {
    for (const [conversationId, room] of rooms) {
      room.delete(socket);
      if (room.size === 0) rooms.delete(conversationId);
    }
  }

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
        joinRoom(query.conversationId, socket);
      }

      socket.on('message', (rawData: Buffer | string) => {
        try {
          const message = JSON.parse(rawData.toString());

          if (message.type === 'join_conversation' && typeof message.conversationId === 'string') {
            joinRoom(message.conversationId, socket);
          }

          if (message.type === 'chat_message' && typeof message.conversationId === 'string') {
            broadcastToRoom(message.conversationId, {
              type: 'new_message',
              data: { ...message, senderId: userId },
            });
          }

          if (message.type === 'typing' && typeof message.conversationId === 'string') {
            broadcastToRoom(
              message.conversationId,
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
