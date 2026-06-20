import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageService } from '../services/message.service';

function delegate() {
  return {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  };
}

function createMockPrisma() {
  return {
    conversation: delegate(),
    conversationMember: delegate(),
    message: delegate(),
    user: delegate(),
    notification: delegate(),
  };
}

describe('MessageService', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let service: MessageService;

  beforeEach(() => {
    prisma = createMockPrisma();
    service = new MessageService(prisma as never);
  });

  describe('getOrCreateDirect', () => {
    it('rejects messaging yourself', async () => {
      await expect(service.getOrCreateDirect('u1', 'u1')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('reuses an existing DIRECT conversation between the two users', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2' });
      prisma.conversationMember.findMany
        .mockResolvedValueOnce([{ conversationId: 'c1' }]) // mine
        .mockResolvedValueOnce([{ conversationId: 'c1' }]); // shared with other
      prisma.conversation.findUnique.mockResolvedValue({
        id: 'c1',
        type: 'DIRECT',
        deletedAt: null,
      });

      const result = await service.getOrCreateDirect('u1', 'u2');

      expect(result).toEqual({ conversationId: 'c1' });
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('creates a new DIRECT conversation with two members when none exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2' });
      prisma.conversationMember.findMany
        .mockResolvedValueOnce([]) // mine
        .mockResolvedValueOnce([]); // shared
      prisma.conversation.create.mockResolvedValue({ id: 'c-new' });

      const result = await service.getOrCreateDirect('u1', 'u2');

      expect(result).toEqual({ conversationId: 'c-new' });
      const createArg = prisma.conversation.create.mock.calls[0][0] as {
        data: { type: string; members: { create: unknown[] } };
      };
      expect(createArg.data.type).toBe('DIRECT');
      expect(createArg.data.members.create).toHaveLength(2);
    });
  });

  describe('sendMessage', () => {
    it('rejects empty text', async () => {
      await expect(service.sendMessage('c1', 'u1', '   ')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('rejects a non-member', async () => {
      prisma.conversationMember.findFirst.mockResolvedValue(null);
      await expect(service.sendMessage('c1', 'u1', 'hi')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('creates a message, bumps the conversation, and notifies the other member', async () => {
      prisma.conversationMember.findFirst.mockResolvedValue({
        conversationId: 'c1',
        userId: 'u1',
        lastReadAt: null,
      });
      prisma.message.create.mockResolvedValue({
        id: 'm1',
        conversationId: 'c1',
        senderId: 'u1',
        content: 'hi',
        createdAt: new Date(),
      });
      prisma.conversation.update.mockResolvedValue({});
      prisma.conversationMember.findMany.mockResolvedValue([{ userId: 'u2' }]);
      prisma.notification.create.mockResolvedValue({});

      const msg = await service.sendMessage('c1', 'u1', 'hi');

      expect(msg.content).toBe('hi');
      expect(msg.isMine).toBe(true);
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { lastMessageAt: expect.any(Date) },
      });
      expect(prisma.notification.create).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('rejects a non-member', async () => {
      prisma.conversationMember.findFirst.mockResolvedValue(null);
      await expect(service.getMessages('c1', 'u1')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('returns messages chronologically with isMine resolved', async () => {
      prisma.conversationMember.findFirst.mockResolvedValue({
        conversationId: 'c1',
        userId: 'u1',
        lastReadAt: null,
      });
      // service queries newest-first then reverses to chronological
      prisma.message.findMany.mockResolvedValue([
        { id: 'm2', conversationId: 'c1', senderId: 'u2', content: 'b', createdAt: new Date(2) },
        { id: 'm1', conversationId: 'c1', senderId: 'u1', content: 'a', createdAt: new Date(1) },
      ]);

      const result = await service.getMessages('c1', 'u1');

      expect(result.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
      expect(result.messages[0].isMine).toBe(true);
      expect(result.messages[1].isMine).toBe(false);
    });
  });

  describe('listConversations', () => {
    it('returns empty when the user has no memberships', async () => {
      prisma.conversationMember.findMany.mockResolvedValue([]);
      const result = await service.listConversations('u1');
      expect(result).toEqual([]);
    });

    it('builds conversation summaries with participant and unread count', async () => {
      prisma.conversationMember.findMany
        .mockResolvedValueOnce([{ conversationId: 'c1', lastReadAt: null }]) // my memberships
        .mockResolvedValueOnce([{ conversationId: 'c1', userId: 'u2' }]); // other members
      prisma.conversation.findMany.mockResolvedValue([{ id: 'c1', lastMessageAt: new Date() }]);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u2', username: 'bob', displayName: 'Bob', avatarUrl: null },
      ]);
      prisma.message.findFirst.mockResolvedValue({ content: 'yo' });
      prisma.message.count.mockResolvedValue(3);

      const result = await service.listConversations('u1');

      expect(result).toHaveLength(1);
      expect(result[0].participant?.username).toBe('bob');
      expect(result[0].lastMessage).toBe('yo');
      expect(result[0].unreadCount).toBe(3);
    });
  });

  describe('markRead', () => {
    it('updates the member lastReadAt', async () => {
      prisma.conversationMember.updateMany.mockResolvedValue({ count: 1 });
      const result = await service.markRead('c1', 'u1');
      expect(result).toEqual({ updated: 1 });
    });
  });
});
