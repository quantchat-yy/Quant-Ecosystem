import { FastifyInstance } from 'fastify';
import { WebSocketServer } from '@quant/realtime/websocket-server';
import { PresenceManager } from '@quant/realtime/presence';
import prisma from '@quant/database';

export async function websocketRoutes(fastify: FastifyInstance) {
  const wss = new WebSocketServer({
    verifyClient: async (info) => {
      return true; // TODO: Add JWT verification
    },
  });

  const presence = new PresenceManager();

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const userId = (req as any).user?.id || 'anonymous';

    wss.handleConnection(connection, userId);
    presence.join(userId, 'global');

    connection.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'join_conversation') {
          wss.joinRoom(connection, message.conversationId);
        }

        if (message.type === 'chat_message') {
          await wss.broadcastToRoom(message.conversationId, {
            type: 'new_message',
            data: message,
          });
        }

        if (message.type === 'typing') {
          await wss.broadcastToRoom(
            message.conversationId,
            {
              type: 'typing_indicator',
              userId,
              isTyping: message.isTyping,
            },
            [connection],
          ); // exclude sender
        }
      } catch (err) {
        console.error('WebSocket error:', err);
      }
    });

    connection.on('close', () => {
      presence.leave(userId, 'global');
    });
  });

  fastify.get('/presence', async () => {
    return presence.getOnlineUsers();
  });
}
