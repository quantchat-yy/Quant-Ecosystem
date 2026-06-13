import type { FastifyInstance, FastifyRequest } from 'fastify';
import websocketPlugin, { type WebSocket } from '@fastify/websocket';

const SIGNALING_TYPES = new Set(['offer', 'answer', 'ice-candidate']);

export async function signalingRoutes(fastify: FastifyInstance) {
  await fastify.register(websocketPlugin);

  const rooms = new Map<string, Set<WebSocket>>();

  function joinRoom(roomId: string, socket: WebSocket): void {
    let room = rooms.get(roomId);
    if (!room) {
      room = new Set();
      rooms.set(roomId, room);
    }
    room.add(socket);
  }

  function broadcastToRoom(roomId: string, payload: unknown, exclude?: WebSocket): void {
    const room = rooms.get(roomId);
    if (!room) return;
    const data = JSON.stringify(payload);
    for (const client of room) {
      if (client !== exclude && client.readyState === client.OPEN) {
        client.send(data);
      }
    }
  }

  function leaveRoom(roomId: string, socket: WebSocket): void {
    const room = rooms.get(roomId);
    if (!room) return;
    room.delete(socket);
    if (room.size === 0) rooms.delete(roomId);
  }

  fastify.get('/ws', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    const roomId = (request.query as { roomId?: string }).roomId;
    if (!roomId) {
      socket.close(4002, 'roomId required');
      return;
    }

    joinRoom(roomId, socket);

    socket.on('message', (rawData: Buffer | string) => {
      try {
        const message = JSON.parse(rawData.toString());
        if (SIGNALING_TYPES.has(message.type)) {
          broadcastToRoom(roomId, message, socket);
        }
      } catch (err) {
        globalThis.console.error('Signaling error:', err);
      }
    });

    socket.on('close', () => {
      leaveRoom(roomId, socket);
    });
  });
}
