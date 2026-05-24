// ============================================================================
// QuantChat API - Messages Controller
// Send/receive messages, read receipts, reactions, replies, editing, pinning
// ============================================================================

import type { Request, Response } from '../middleware';
import { messagingService } from '../services/messaging-service';
import type { SendMessageRequest, MessageEdit, MessagePin } from '../../src/types';

export class MessagesController {
  async sendMessage(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as SendMessageRequest;

    if (!body.conversationId || (!body.content && !body.mediaUrl)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Conversation ID and content are required', statusCode: 400 } });
      return;
    }

    try {
      const message = await messagingService.sendMessage(userId, body);
      res.status(201).json({ success: true, data: message });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to send message';
      res.status(400).json({ success: false, error: { code: 'SEND_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getMessages(req: Request, res: Response): Promise<void> {
    const conversationId = req.params['conversationId'];
    const limit = parseInt(req.query['limit'] as string) || 50;
    const before = req.query['before'] as string | undefined;

    if (!conversationId) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Conversation ID is required', statusCode: 400 } });
      return;
    }

    const messages = await messagingService.getConversationMessages(conversationId, limit, before);
    res.status(200).json({ success: true, data: messages, metadata: { count: messages.length, limit } });
  }

  async getMessage(req: Request, res: Response): Promise<void> {
    const messageId = req.params['messageId'];
    const message = await messagingService.getMessage(messageId);

    if (!message) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Message not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: message });
  }

  async editMessage(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const messageId = req.params['messageId'];
    const body = req.body as MessageEdit;

    if (!body.newContent) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'New content is required', statusCode: 400 } });
      return;
    }

    try {
      const message = await messagingService.editMessage(messageId, userId, body.newContent);
      res.status(200).json({ success: true, data: message });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to edit message';
      res.status(400).json({ success: false, error: { code: 'EDIT_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async deleteMessage(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const messageId = req.params['messageId'];

    try {
      await messagingService.deleteMessage(messageId, userId);
      res.status(200).json({ success: true, data: { message: 'Message deleted' } });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to delete message';
      res.status(400).json({ success: false, error: { code: 'DELETE_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async addReaction(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const messageId = req.params['messageId'];
    const body = req.body as { emoji: string };

    if (!body.emoji) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Emoji is required', statusCode: 400 } });
      return;
    }

    try {
      const message = await messagingService.addReaction(messageId, userId, body.emoji);
      res.status(200).json({ success: true, data: message });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to add reaction';
      res.status(400).json({ success: false, error: { code: 'REACTION_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async removeReaction(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const messageId = req.params['messageId'];

    try {
      const message = await messagingService.removeReaction(messageId, userId);
      res.status(200).json({ success: true, data: message });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to remove reaction';
      res.status(400).json({ success: false, error: { code: 'REACTION_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const conversationId = req.params['conversationId'];
    const body = req.body as { messageIds: string[] };

    if (!body.messageIds || !Array.isArray(body.messageIds)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Message IDs array is required', statusCode: 400 } });
      return;
    }

    await messagingService.markAsRead(conversationId, userId, body.messageIds);
    res.status(200).json({ success: true, data: { message: 'Messages marked as read' } });
  }

  async pinMessage(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const messageId = req.params['messageId'];

    try {
      const message = await messagingService.pinMessage(messageId, userId);
      res.status(200).json({ success: true, data: message });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to pin message';
      res.status(400).json({ success: false, error: { code: 'PIN_FAILED', message: msg, statusCode: 400 } });
    }
  }

  async getConversations(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const conversations = await messagingService.getUserConversations(userId);
    res.status(200).json({ success: true, data: conversations });
  }

  async getConversation(req: Request, res: Response): Promise<void> {
    const conversationId = req.params['conversationId'];
    const conversation = await messagingService.getConversation(conversationId);

    if (!conversation) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Conversation not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: conversation });
  }

  async createConversation(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as { participantIds: string[]; name?: string };

    if (!body.participantIds || body.participantIds.length === 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'At least one participant is required', statusCode: 400 } });
      return;
    }

    const conversation = await messagingService.createConversation(userId, body.participantIds, body.name);
    res.status(201).json({ success: true, data: conversation });
  }

  async setTyping(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const conversationId = req.params['conversationId'];
    const body = req.body as { isTyping: boolean };

    messagingService.setTyping(conversationId, userId, body.isTyping ?? true);
    res.status(200).json({ success: true, data: { conversationId, isTyping: body.isTyping ?? true } });
  }

  async getTypingUsers(req: Request, res: Response): Promise<void> {
    const conversationId = req.params['conversationId'];
    const users = messagingService.getTypingUsers(conversationId);
    res.status(200).json({ success: true, data: { conversationId, typingUsers: users } });
  }
}

export const messagesController = new MessagesController();
