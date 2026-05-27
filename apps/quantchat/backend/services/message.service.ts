import type { PrismaClient, Message } from '@prisma/client';
import * as crypto from 'node:crypto';
import { createAppError } from '@quant/server-core';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface RecipientPublicKey {
  userId: string;
  publicKey: string;
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  authTag: string;
  encryptedKeys: Array<{
    recipientId: string;
    encryptedKey: string;
  }>;
}

export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  content: string;
  type?: string;
  mediaUrl?: string;
  replyToId?: string;
  metadata?: Record<string, unknown>;
  encryption?: 'e2e';
  recipientPublicKeys?: RecipientPublicKey[];
}

export class MessageService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Encrypt plaintext for multiple recipients using AES-256-GCM with a
   * random session key, encrypted per-recipient with their public key.
   */
  encryptForRecipients(
    plaintext: string,
    recipientPublicKeys: RecipientPublicKey[],
  ): EncryptedPayload {
    // Generate random AES-256 session key
    const sessionKey = crypto.randomBytes(32);
    const nonce = crypto.randomBytes(12);

    // Encrypt the plaintext with AES-256-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, nonce);
    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(plaintext, 'utf-8')),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Encrypt the session key for each recipient using their public key
    const encryptedKeys = recipientPublicKeys.map((recipient) => {
      const publicKeyDer = Buffer.from(recipient.publicKey, 'base64');
      const publicKeyObj = crypto.createPublicKey({
        key: publicKeyDer,
        format: 'der',
        type: 'spki',
      });
      const encryptedKey = crypto.publicEncrypt(
        {
          key: publicKeyObj,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        sessionKey,
      );
      return {
        recipientId: recipient.userId,
        encryptedKey: encryptedKey.toString('base64'),
      };
    });

    // Zero the session key after use to prevent memory leakage
    sessionKey.fill(0);

    return {
      ciphertext: ciphertext.toString('base64'),
      nonce: nonce.toString('base64'),
      authTag: authTag.toString('base64'),
      encryptedKeys,
    };
  }

  async sendMessage(input: SendMessageInput): Promise<Message> {
    const {
      conversationId,
      senderId,
      content,
      type,
      mediaUrl,
      replyToId,
      metadata,
      encryption,
      recipientPublicKeys,
    } = input;

    // Verify user is a member of the conversation
    const membership = await this.prisma.conversationMember.findFirst({
      where: { conversationId, userId: senderId, leftAt: null },
    });

    if (!membership) {
      throw createAppError('User is not a member of this conversation', 403, 'NOT_A_MEMBER');
    }

    let storedContent = content;

    // When encryption is 'e2e', encrypt the content for recipients
    if (encryption === 'e2e') {
      if (!recipientPublicKeys || recipientPublicKeys.length === 0) {
        throw createAppError(
          'Recipient public keys required for E2E encryption',
          400,
          'MISSING_RECIPIENT_KEYS',
        );
      }
      const encryptedPayload = this.encryptForRecipients(content, recipientPublicKeys);
      storedContent = JSON.stringify(encryptedPayload);
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: storedContent,
        type: type ?? 'text',
        mediaUrl: mediaUrl ?? null,
        replyToId: replyToId ?? null,
        metadata: metadata ?? {},
      },
    });

    // Update conversation's last message timestamp
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async getMessages(
    conversationId: string,
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Message>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 50;
    const skip = (page - 1) * pageSize;

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId, isDeleted: false },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({ where: { conversationId, isDeleted: false } }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async editMessage(messageId: string, userId: string, content: string): Promise<Message> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw createAppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    if (message.senderId !== userId) {
      throw createAppError('Only the sender can edit this message', 403, 'NOT_MESSAGE_OWNER');
    }

    // Only allow editing within 15 minutes
    const fifteenMinutes = 15 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > fifteenMinutes) {
      throw createAppError(
        'Message can only be edited within 15 minutes',
        400,
        'EDIT_WINDOW_EXPIRED',
      );
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content, isEdited: true, updatedAt: new Date() },
    });
  }

  async deleteMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw createAppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    if (message.senderId !== userId) {
      throw createAppError('Only the sender can delete this message', 403, 'NOT_MESSAGE_OWNER');
    }

    // Soft delete
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, updatedAt: new Date() },
    });
  }

  async pinMessage(messageId: string, userId: string): Promise<Message> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw createAppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    // Verify user is a member of the conversation
    const membership = await this.prisma.conversationMember.findFirst({
      where: { conversationId: message.conversationId, userId, leftAt: null },
    });

    if (!membership) {
      throw createAppError('User is not a member of this conversation', 403, 'NOT_A_MEMBER');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { metadata: { ...(message.metadata as object), pinned: true, pinnedBy: userId } },
    });
  }

  async reactToMessage(messageId: string, userId: string, reaction: string): Promise<Message> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw createAppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
    }

    // Verify user is a member of the conversation
    const membership = await this.prisma.conversationMember.findFirst({
      where: { conversationId: message.conversationId, userId, leftAt: null },
    });

    if (!membership) {
      throw createAppError('User is not a member of this conversation', 403, 'NOT_A_MEMBER');
    }

    const currentMetadata = (message.metadata as Record<string, unknown>) ?? {};
    const reactions = (currentMetadata['reactions'] as Record<string, string[]>) ?? {};
    const usersForReaction = reactions[reaction] ?? [];

    if (usersForReaction.includes(userId)) {
      // Remove reaction (toggle off)
      reactions[reaction] = usersForReaction.filter((id) => id !== userId);
      if (reactions[reaction]!.length === 0) {
        delete reactions[reaction];
      }
    } else {
      // Add reaction
      reactions[reaction] = [...usersForReaction, userId];
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { metadata: { ...currentMetadata, reactions } },
    });
  }

  async searchMessages(
    userId: string,
    query: string,
    options: PaginationOptions = {},
  ): Promise<PaginatedResult<Message>> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    // Get conversation IDs the user belongs to
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId, leftAt: null },
      select: { conversationId: true },
    });

    const conversationIds = memberships.map((m: { conversationId: string }) => m.conversationId);

    // NOTE: Messages with E2E encryption store ciphertext in the content field and cannot
    // be searched server-side. A separate metadata index is needed for searching encrypted
    // messages (e.g., client-side search or a dedicated encrypted search index).
    // For now, we exclude messages whose content looks like E2E encrypted payloads.
    const where = {
      conversationId: { in: conversationIds },
      isDeleted: false,
      content: { contains: query, mode: 'insensitive' as const },
      NOT: { content: { startsWith: '{"ciphertext"' } },
    };

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.message.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
