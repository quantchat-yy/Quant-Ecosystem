import { describe, it, expect, beforeEach } from 'vitest';
import { MeetingChatService } from '../services/meeting-chat.service';

describe('MeetingChatService', () => {
  let service: MeetingChatService;

  beforeEach(() => {
    service = new MeetingChatService();
  });

  describe('postMessage', () => {
    it('stores a trimmed message and returns it', () => {
      const msg = service.postMessage('room-1', {
        userId: 'u1',
        displayName: 'Alice',
        text: '  hello team  ',
      });

      expect(msg.id).toBeDefined();
      expect(msg.roomId).toBe('room-1');
      expect(msg.userId).toBe('u1');
      expect(msg.displayName).toBe('Alice');
      expect(msg.text).toBe('hello team');
      expect(msg.createdAt).toBeInstanceOf(Date);
    });

    it('rejects an empty / whitespace-only message', () => {
      expect(() =>
        service.postMessage('room-1', { userId: 'u1', displayName: 'A', text: '   ' }),
      ).toThrow('Message text is required');
    });

    it('rejects a message that is too long', () => {
      expect(() =>
        service.postMessage('room-1', {
          userId: 'u1',
          displayName: 'A',
          text: 'x'.repeat(4001),
        }),
      ).toThrow('Message text is too long');
    });

    it('keeps messages per-room and ordered', () => {
      service.postMessage('room-1', { userId: 'u1', displayName: 'A', text: 'first' });
      service.postMessage('room-1', { userId: 'u2', displayName: 'B', text: 'second' });
      service.postMessage('room-2', { userId: 'u3', displayName: 'C', text: 'other' });

      const r1 = service.listMessages('room-1');
      expect(r1).toHaveLength(2);
      expect(r1[0]!.text).toBe('first');
      expect(r1[1]!.text).toBe('second');
      expect(service.listMessages('room-2')).toHaveLength(1);
    });
  });

  describe('listMessages', () => {
    it('returns an empty array for a room with no messages', () => {
      expect(service.listMessages('ghost')).toEqual([]);
    });

    it('returns a defensive copy (mutating the result does not affect store)', () => {
      service.postMessage('room-1', { userId: 'u1', displayName: 'A', text: 'hi' });
      const list = service.listMessages('room-1');
      list.pop();
      expect(service.listMessages('room-1')).toHaveLength(1);
    });
  });

  describe('postReaction', () => {
    it('stores a reaction and returns it', () => {
      const r = service.postReaction('room-1', { userId: 'u1', emoji: '🎉' });
      expect(r.id).toBeDefined();
      expect(r.emoji).toBe('🎉');
      expect(service.listReactions('room-1')).toHaveLength(1);
    });

    it('rejects an empty emoji', () => {
      expect(() => service.postReaction('room-1', { userId: 'u1', emoji: '  ' })).toThrow(
        'Reaction emoji is required',
      );
    });
  });

  describe('clearRoom', () => {
    it('drops chat and reactions for the room', () => {
      service.postMessage('room-1', { userId: 'u1', displayName: 'A', text: 'hi' });
      service.postReaction('room-1', { userId: 'u1', emoji: '👍' });

      service.clearRoom('room-1');

      expect(service.listMessages('room-1')).toEqual([]);
      expect(service.listReactions('room-1')).toEqual([]);
    });
  });
});
