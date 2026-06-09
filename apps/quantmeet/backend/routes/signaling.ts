import { FastifyInstance } from 'fastify';
import { WebSocketServer } from '@quant/realtime/websocket-server';

export async function signalingRoutes(fastify: FastifyInstance) {
  const wss = new WebSocketServer();

  fastify.get('/ws', { websocket: true }, (connection, req) => {
    const roomId = (req.query as any).roomId;
    const userId = (req as any).user?.id || 'anonymous';

    wss.handleConnection(connection, userId);

    connection.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (
          message.type === 'offer' ||
          message.type === 'answer' ||
          message.type === 'ice-candidate'
        ) {
          // Broadcast signaling messages to room
          await wss.broadcastToRoom(roomId, message, [connection]);
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    });
  });
}
