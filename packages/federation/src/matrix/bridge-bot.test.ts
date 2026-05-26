import { describe, it, expect } from 'vitest';
import { MatrixBridgeBot } from './bridge-bot.js';
import { RoomMapper } from './room-mapper.js';

describe('MatrixBridgeBot', () => {
  it('Quant DM forwarded to Matrix room', () => {
    const mapper = new RoomMapper();
    mapper.createMapping('conv-1', '!room1:matrix.org', 'dm');
    const bot = new MatrixBridgeBot(mapper);

    bot.onQuantMessage({
      conversationId: 'conv-1',
      senderId: 'user-alice',
      content: 'Hello from Quant!',
    });

    const messages = bot.getForwardedMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.direction).toBe('quant-to-matrix');
    expect(messages[0]!.destination).toBe('!room1:matrix.org');
    expect(messages[0]!.content).toBe('Hello from Quant!');
  });

  it('Matrix message forwarded to Quant conversation', () => {
    const mapper = new RoomMapper();
    mapper.createMapping('conv-2', '!room2:matrix.org', 'dm');
    const bot = new MatrixBridgeBot(mapper);

    bot.onMatrixMessage({
      roomId: '!room2:matrix.org',
      sender: '@bob:matrix.org',
      content: 'Hello from Matrix!',
    });

    const messages = bot.getForwardedMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.direction).toBe('matrix-to-quant');
    expect(messages[0]!.destination).toBe('conv-2');
    expect(messages[0]!.content).toBe('Hello from Matrix!');
  });

  it('unmapped conversation triggers room creation', () => {
    const bot = new MatrixBridgeBot(undefined, { autoCreateRooms: true });

    bot.onQuantMessage({
      conversationId: 'new-conv',
      senderId: 'user-carol',
      content: 'First message',
    });

    const messages = bot.getForwardedMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.direction).toBe('quant-to-matrix');
    expect(messages[0]!.destination).toContain('new-conv');

    const mapper = bot.getRoomMapper();
    expect(mapper.getMatrixRoom('new-conv')).toBeDefined();
  });
});
