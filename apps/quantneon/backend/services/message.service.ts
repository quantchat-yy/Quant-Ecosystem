import type { PrismaClient } from '../types';
import { createAppError } from '@quant/server-core';

// ============================================================================
// QuantNeon — MessageService (Direct Messages)
// ============================================================================
//
// 1:1 direct messaging on the SHARED Conversation / ConversationMember /
// Message models. A DM is a DIRECT conversation with exactly two members;
// unread counts are derived from each member's `lastReadAt`.

export interface DMParticipant {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface DMConversation {
  id: string;
  participant: DMParticipant | null;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
}

export interface DMMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isMine: boolean;
  createdAt: Date;
}

interface MemberRow {
  conversationId: string;
  userId: string;
  lastReadAt: Date | null;
}

export class MessageService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Assert the user is an active member of the conversation; returns the member row. */
  private async assertMember(conversationId: string, userId: string): Promise<MemberRow> {
    const member = (await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId, leftAt: null },
    })) as MemberRow | null;
    if (!member) {
      throw createAppError('Conversation not found', 404, 'NOT_A_MEMBER');
    }
    return member;
  }

  /** List the viewer's direct conversations, newest activity first, with unread counts. */
  async listConversations(userId: string): Promise<DMConversation[]> {
    const myMemberships = (await this.prisma.conversationMember.findMany({
      where: { userId, leftAt: null },
      select: { conversationId: true, lastReadAt: true },
    })) as Array<{ conversationId: string; lastReadAt: Date | null }>;

    if (myMemberships.length === 0) return [];
    const convoIds = myMemberships.map((m) => m.conversationId);
    const lastReadByConvo = new Map(myMemberships.map((m) => [m.conversationId, m.lastReadAt]));

    const conversations = (await this.prisma.conversation.findMany({
      where: { id: { in: convoIds }, type: 'DIRECT', deletedAt: null },
      orderBy: { lastMessageAt: 'desc' },
    })) as Array<{ id: string; lastMessageAt: Date | null }>;

    // Resolve the "other" participant per conversation (the member who is not the viewer).
    const otherMembers = (await this.prisma.conversationMember.findMany({
      where: { conversationId: { in: convoIds }, userId: { not: userId }, leftAt: null },
      select: { conversationId: true, userId: true },
    })) as Array<{ conversationId: string; userId: string }>;
    const otherUserIdByConvo = new Map(otherMembers.map((m) => [m.conversationId, m.userId]));

    const otherUserIds = [...new Set(otherMembers.map((m) => m.userId))];
    const users =
      otherUserIds.length > 0
        ? ((await this.prisma.user.findMany({
            where: { id: { in: otherUserIds } },
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          })) as DMParticipant[])
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const result: DMConversation[] = [];
    for (const convo of conversations) {
      const lastReadAt = lastReadByConvo.get(convo.id) ?? null;
      const [lastMsg, unreadCount] = await Promise.all([
        this.prisma.message.findFirst({
          where: { conversationId: convo.id, isDeleted: false },
          orderBy: { createdAt: 'desc' },
          select: { content: true },
        }) as Promise<{ content: string | null } | null>,
        this.prisma.message.count({
          where: {
            conversationId: convo.id,
            isDeleted: false,
            senderId: { not: userId },
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        }),
      ]);
      const otherId = otherUserIdByConvo.get(convo.id);
      result.push({
        id: convo.id,
        participant: otherId ? (userById.get(otherId) ?? null) : null,
        lastMessage: lastMsg?.content ?? null,
        lastMessageAt: convo.lastMessageAt,
        unreadCount,
      });
    }
    return result;
  }

  /** Find the existing 1:1 DIRECT conversation between two users, or create one. */
  async getOrCreateDirect(
    userId: string,
    otherUserId: string,
  ): Promise<{ conversationId: string }> {
    if (userId === otherUserId) {
      throw createAppError('Cannot message yourself', 400, 'SELF_DM');
    }
    const other = await this.prisma.user.findUnique({ where: { id: otherUserId } });
    if (!other) {
      throw createAppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const mine = (await this.prisma.conversationMember.findMany({
      where: { userId, leftAt: null },
      select: { conversationId: true },
    })) as Array<{ conversationId: string }>;
    const myConvoIds = mine.map((m) => m.conversationId);

    if (myConvoIds.length > 0) {
      const shared = (await this.prisma.conversationMember.findMany({
        where: { conversationId: { in: myConvoIds }, userId: otherUserId, leftAt: null },
        select: { conversationId: true },
      })) as Array<{ conversationId: string }>;
      for (const s of shared) {
        const convo = (await this.prisma.conversation.findUnique({
          where: { id: s.conversationId },
          select: { id: true, type: true, deletedAt: true },
        })) as { id: string; type: string; deletedAt: Date | null } | null;
        if (convo && convo.type === 'DIRECT' && !convo.deletedAt) {
          return { conversationId: convo.id };
        }
      }
    }

    const created = (await this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        createdBy: userId,
        lastMessageAt: new Date(),
        members: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: otherUserId, role: 'MEMBER' },
          ],
        },
      },
    })) as { id: string };
    return { conversationId: created.id };
  }

  async getMessages(
    conversationId: string,
    userId: string,
    options: { page?: number; pageSize?: number } = {},
  ): Promise<{ messages: DMMessage[]; page: number; hasMore: boolean }> {
    await this.assertMember(conversationId, userId);
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 50));
    const skip = (page - 1) * pageSize;

    const rows = (await this.prisma.message.findMany({
      where: { conversationId, isDeleted: false },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    })) as Array<{
      id: string;
      conversationId: string;
      senderId: string;
      content: string | null;
      createdAt: Date;
    }>;

    // Return chronological (oldest -> newest) for rendering.
    const ordered = [...rows].reverse();
    return {
      messages: ordered.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        senderId: m.senderId,
        content: m.content ?? '',
        isMine: m.senderId === userId,
        createdAt: m.createdAt,
      })),
      page,
      hasMore: rows.length === pageSize,
    };
  }

  async sendMessage(conversationId: string, userId: string, text: string): Promise<DMMessage> {
    const trimmed = text.trim();
    if (!trimmed) {
      throw createAppError('Message text is required', 400, 'EMPTY_MESSAGE');
    }
    await this.assertMember(conversationId, userId);

    const created = (await this.prisma.message.create({
      data: { conversationId, senderId: userId, type: 'TEXT', content: trimmed },
    })) as {
      id: string;
      conversationId: string;
      senderId: string;
      content: string | null;
      createdAt: Date;
    };

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    // Best-effort DM notification to the other participant(s).
    try {
      const others = (await this.prisma.conversationMember.findMany({
        where: { conversationId, userId: { not: userId }, leftAt: null },
        select: { userId: true },
      })) as Array<{ userId: string }>;
      for (const o of others) {
        await this.prisma.notification.create({
          data: {
            userId: o.userId,
            type: 'message',
            title: 'New message',
            body: trimmed.slice(0, 100),
            sourceApp: 'quantneon',
            sourceUserId: userId,
            sourceEntityId: conversationId,
          },
        });
      }
    } catch {
      /* notification failure must not fail the send */
    }

    return {
      id: created.id,
      conversationId: created.conversationId,
      senderId: created.senderId,
      content: created.content ?? '',
      isMine: true,
      createdAt: created.createdAt,
    };
  }

  async markRead(conversationId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
    return { updated: result.count };
  }
}
