// ============================================================================
// QuantChat - Messaging Service
// Message delivery, end-to-end encryption simulation, offline queue management
// ============================================================================

import type {
  Message, MessageStatus, MessageType, DisappearMode,
  MessageReaction, ReadReceipt, Conversation, ConversationParticipant,
  SendMessageRequest, TypingIndicator,
} from '../../src/types';

// ============================================================================
// Encryption Service (simulated E2E encryption)
// ============================================================================

interface EncryptionKeyPair {
  publicKey: string;
  privateKey: string;
  sessionKey: string;
}

class EncryptionManager {
  private keyPairs: Map<string, EncryptionKeyPair> = new Map();

  generateKeyPair(userId: string): EncryptionKeyPair {
    const pair: EncryptionKeyPair = {
      publicKey: `pub_${userId}_${this.randomHex(32)}`,
      privateKey: `priv_${userId}_${this.randomHex(32)}`,
      sessionKey: `sess_${this.randomHex(64)}`,
    };
    this.keyPairs.set(userId, pair);
    return pair;
  }

  getPublicKey(userId: string): string | null {
    return this.keyPairs.get(userId)?.publicKey || null;
  }

  encryptMessage(content: string, senderKey: string, recipientKey: string): string {
    // Simulated encryption: XOR-style transformation with base64 encoding
    const combined = `${senderKey}:${recipientKey}`;
    const seed = this.hashCode(combined);
    const encrypted = Buffer.from(content).toString('base64');
    return `enc_v1:${seed.toString(16)}:${encrypted}`;
  }

  decryptMessage(encrypted: string, _senderKey: string, _recipientKey: string): string {
    const parts = encrypted.split(':');
    if (parts[0] !== 'enc_v1' || parts.length < 3) return encrypted;
    return Buffer.from(parts.slice(2).join(':'), 'base64').toString('utf-8');
  }

  private randomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// Offline Queue Manager
// ============================================================================

interface QueuedMessage {
  message: Message;
  recipientId: string;
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  queuedAt: Date;
}

class OfflineQueueManager {
  private queues: Map<string, QueuedMessage[]> = new Map();

  enqueue(message: Message, recipientId: string): void {
    const queue = this.queues.get(recipientId) || [];
    queue.push({
      message,
      recipientId,
      attempts: 0,
      maxAttempts: 5,
      nextRetryAt: new Date(),
      queuedAt: new Date(),
    });
    this.queues.set(recipientId, queue);
  }

  dequeue(recipientId: string): QueuedMessage[] {
    const queue = this.queues.get(recipientId) || [];
    this.queues.delete(recipientId);
    return queue;
  }

  getQueueSize(recipientId: string): number {
    return (this.queues.get(recipientId) || []).length;
  }

  getTotalQueuedMessages(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  retryFailed(): QueuedMessage[] {
    const now = new Date();
    const retryable: QueuedMessage[] = [];
    for (const [userId, queue] of this.queues) {
      const remaining: QueuedMessage[] = [];
      for (const item of queue) {
        if (item.attempts >= item.maxAttempts) continue;
        if (item.nextRetryAt <= now) {
          item.attempts++;
          item.nextRetryAt = new Date(now.getTime() + Math.pow(2, item.attempts) * 1000);
          retryable.push(item);
        }
        remaining.push(item);
      }
      this.queues.set(userId, remaining);
    }
    return retryable;
  }
}

// ============================================================================
// Disappearing Message Manager
// ============================================================================

class DisappearingMessageManager {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private onExpire: (messageId: string) => void;

  constructor(onExpire: (messageId: string) => void) {
    this.onExpire = onExpire;
  }

  schedule(message: Message): void {
    if (message.disappearMode === 'off') return;

    let delay: number;
    switch (message.disappearMode) {
      case 'after_view':
        // Will be triggered on read receipt
        return;
      case '24h':
        delay = 24 * 60 * 60 * 1000;
        break;
      case '7d':
        delay = 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        delay = 30 * 24 * 60 * 60 * 1000;
        break;
      default:
        return;
    }

    const timer = setTimeout(() => {
      this.onExpire(message.id);
      this.timers.delete(message.id);
    }, delay);

    this.timers.set(message.id, timer);
  }

  triggerAfterView(messageId: string, delayMs: number = 10000): void {
    const timer = setTimeout(() => {
      this.onExpire(messageId);
      this.timers.delete(messageId);
    }, delayMs);
    this.timers.set(messageId, timer);
  }

  cancel(messageId: string): void {
    const timer = this.timers.get(messageId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(messageId);
    }
  }

  getActiveCount(): number {
    return this.timers.size;
  }
}

// ============================================================================
// Messaging Service
// ============================================================================

export class MessagingService {
  private messages: Map<string, Message> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private encryption: EncryptionManager;
  private offlineQueue: OfflineQueueManager;
  private disappearing: DisappearingMessageManager;
  private typingIndicators: Map<string, TypingIndicator> = new Map();
  private onlineUsers: Set<string> = new Set();

  constructor() {
    this.encryption = new EncryptionManager();
    this.offlineQueue = new OfflineQueueManager();
    this.disappearing = new DisappearingMessageManager((messageId) => {
      this.expireMessage(messageId);
    });
  }

  // --------------------------------------------------------------------------
  // Message Operations
  // --------------------------------------------------------------------------

  async sendMessage(senderId: string, request: SendMessageRequest): Promise<Message> {
    const conversation = this.conversations.get(request.conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Verify sender is a participant
    const isMember = conversation.participants.some(p => p.userId === senderId);
    if (!isMember) {
      throw new Error('User is not a member of this conversation');
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Encrypt content if enabled
    let content = request.content;
    let encryptionKey: string | undefined;
    if (conversation.encryptionEnabled) {
      const senderKey = this.encryption.getPublicKey(senderId) || this.encryption.generateKeyPair(senderId).publicKey;
      encryptionKey = `enc_${messageId}`;
      content = this.encryption.encryptMessage(request.content, senderKey, encryptionKey);
    }

    const message: Message = {
      id: messageId,
      conversationId: request.conversationId,
      senderId,
      type: request.type,
      content,
      mediaUrl: request.mediaUrl,
      status: 'sending',
      disappearMode: request.disappearMode || conversation.disappearMode,
      replyTo: request.replyTo,
      reactions: [],
      isPinned: false,
      isEdited: false,
      mentions: request.mentions || [],
      encryptionKey,
      readBy: [],
      deliveredTo: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.messages.set(messageId, message);

    // Deliver to participants
    const recipients = conversation.participants.filter(p => p.userId !== senderId);
    for (const recipient of recipients) {
      if (this.onlineUsers.has(recipient.userId)) {
        message.status = 'delivered';
        message.deliveredTo.push(recipient.userId);
      } else {
        this.offlineQueue.enqueue(message, recipient.userId);
      }
    }

    if (message.status !== 'delivered') {
      message.status = 'sent';
    }

    // Update conversation
    conversation.lastMessage = message;
    conversation.lastActivityAt = new Date();
    conversation.updatedAt = new Date();

    // Schedule disappearing
    this.disappearing.schedule(message);

    return message;
  }

  async getMessage(messageId: string): Promise<Message | null> {
    return this.messages.get(messageId) || null;
  }

  async getConversationMessages(conversationId: string, limit: number = 50, before?: string): Promise<Message[]> {
    const messages: Message[] = [];
    for (const msg of this.messages.values()) {
      if (msg.conversationId === conversationId) {
        messages.push(msg);
      }
    }

    messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (before) {
      const idx = messages.findIndex(m => m.id === before);
      if (idx >= 0) {
        return messages.slice(idx + 1, idx + 1 + limit);
      }
    }

    return messages.slice(0, limit);
  }

  async editMessage(messageId: string, userId: string, newContent: string): Promise<Message> {
    const message = this.messages.get(messageId);
    if (!message) throw new Error('Message not found');
    if (message.senderId !== userId) throw new Error('Can only edit own messages');

    const editWindow = 15 * 60 * 1000; // 15 minutes
    if (Date.now() - new Date(message.createdAt).getTime() > editWindow) {
      throw new Error('Edit window has expired');
    }

    message.content = newContent;
    message.isEdited = true;
    message.editedAt = new Date();
    message.updatedAt = new Date();

    return message;
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (!message) throw new Error('Message not found');
    if (message.senderId !== userId) throw new Error('Can only delete own messages');

    this.messages.delete(messageId);
    this.disappearing.cancel(messageId);
  }

  async pinMessage(messageId: string, userId: string): Promise<Message> {
    const message = this.messages.get(messageId);
    if (!message) throw new Error('Message not found');

    message.isPinned = !message.isPinned;
    message.updatedAt = new Date();
    return message;
  }

  // --------------------------------------------------------------------------
  // Reactions & Read Receipts
  // --------------------------------------------------------------------------

  async addReaction(messageId: string, userId: string, emoji: string): Promise<Message> {
    const message = this.messages.get(messageId);
    if (!message) throw new Error('Message not found');

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(r => r.userId !== userId);
    message.reactions.push({ userId, emoji, timestamp: new Date() });
    message.updatedAt = new Date();

    return message;
  }

  async removeReaction(messageId: string, userId: string): Promise<Message> {
    const message = this.messages.get(messageId);
    if (!message) throw new Error('Message not found');

    message.reactions = message.reactions.filter(r => r.userId !== userId);
    message.updatedAt = new Date();
    return message;
  }

  async markAsRead(conversationId: string, userId: string, messageIds: string[]): Promise<void> {
    for (const msgId of messageIds) {
      const message = this.messages.get(msgId);
      if (!message || message.conversationId !== conversationId) continue;

      if (!message.readBy.some(r => r.userId === userId)) {
        message.readBy.push({ userId, readAt: new Date() });

        // Check if all recipients have read
        const conversation = this.conversations.get(conversationId);
        if (conversation) {
          const recipientCount = conversation.participants.length - 1;
          if (message.readBy.length >= recipientCount) {
            message.status = 'read';
          }
        }

        // Trigger disappear after view
        if (message.disappearMode === 'after_view' && message.senderId !== userId) {
          this.disappearing.triggerAfterView(message.id);
        }
      }
    }

    // Update conversation unread count
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      const participant = conversation.participants.find(p => p.userId === userId);
      if (participant) {
        participant.lastReadAt = new Date();
      }
      conversation.unreadCount = 0;
    }
  }

  // --------------------------------------------------------------------------
  // Conversation Operations
  // --------------------------------------------------------------------------

  async createConversation(creatorId: string, participantIds: string[], name?: string): Promise<Conversation> {
    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const allParticipants = [creatorId, ...participantIds.filter(id => id !== creatorId)];

    const conversation: Conversation = {
      id: convId,
      type: allParticipants.length > 2 ? 'group' : 'direct',
      participants: allParticipants.map((id, idx) => ({
        userId: id,
        username: `user_${id}`,
        displayName: `User ${id}`,
        role: idx === 0 ? 'admin' : 'member',
        joinedAt: new Date(),
      })),
      name,
      lastActivityAt: new Date(),
      unreadCount: 0,
      isPinned: false,
      isMuted: false,
      disappearMode: 'off',
      encryptionEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(convId, conversation);

    // Generate encryption keys for all participants
    for (const id of allParticipants) {
      if (!this.encryption.getPublicKey(id)) {
        this.encryption.generateKeyPair(id);
      }
    }

    return conversation;
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    return this.conversations.get(conversationId) || null;
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    const conversations: Conversation[] = [];
    for (const conv of this.conversations.values()) {
      if (conv.participants.some(p => p.userId === userId)) {
        conversations.push(conv);
      }
    }
    return conversations.sort((a, b) =>
      new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime()
    );
  }

  // --------------------------------------------------------------------------
  // Typing Indicators & Presence
  // --------------------------------------------------------------------------

  setTyping(conversationId: string, userId: string, isTyping: boolean): void {
    const key = `${conversationId}:${userId}`;
    if (isTyping) {
      this.typingIndicators.set(key, {
        conversationId,
        userId,
        isTyping: true,
        timestamp: new Date(),
      });
      // Auto-clear after 5 seconds
      setTimeout(() => this.typingIndicators.delete(key), 5000);
    } else {
      this.typingIndicators.delete(key);
    }
  }

  getTypingUsers(conversationId: string): string[] {
    const users: string[] = [];
    for (const [key, indicator] of this.typingIndicators) {
      if (key.startsWith(`${conversationId}:`) && indicator.isTyping) {
        users.push(indicator.userId);
      }
    }
    return users;
  }

  setUserOnline(userId: string): void {
    this.onlineUsers.add(userId);
    // Deliver queued messages
    const queued = this.offlineQueue.dequeue(userId);
    for (const item of queued) {
      item.message.status = 'delivered';
      item.message.deliveredTo.push(userId);
    }
  }

  setUserOffline(userId: string): void {
    this.onlineUsers.delete(userId);
  }

  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private expireMessage(messageId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      message.content = '[Message expired]';
      message.mediaUrl = undefined;
      message.expiresAt = new Date();
      message.updatedAt = new Date();
    }
  }

  // --------------------------------------------------------------------------
  // Stats
  // --------------------------------------------------------------------------

  getStats(): { messages: number; conversations: number; onlineUsers: number; queuedMessages: number } {
    return {
      messages: this.messages.size,
      conversations: this.conversations.size,
      onlineUsers: this.onlineUsers.size,
      queuedMessages: this.offlineQueue.getTotalQueuedMessages(),
    };
  }
}

export const messagingService = new MessagingService();
