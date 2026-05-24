// ============================================================================
// QuantChat API - Messages Routes
// Send/receive messages (text, image, video, voice, disappearing), read receipts, reactions, replies
// ============================================================================

import { messagesController } from '../controllers/messages-controller';
import type { RouteDefinition } from './auth';
import { contentValidation } from '../middleware';

const messageContentValidation = contentValidation({ maxTextLength: 10000, requireContent: true });

export const messageRoutes: RouteDefinition[] = [
  // Conversations
  {
    method: 'GET',
    path: '/conversations',
    handler: (req, res) => messagesController.getConversations(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/conversations',
    handler: (req, res) => messagesController.createConversation(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/conversations/:conversationId',
    handler: (req, res) => messagesController.getConversation(req, res),
    requiresAuth: true,
  },

  // Messages
  {
    method: 'POST',
    path: '/conversations/:conversationId/messages',
    handler: (req, res) => messagesController.sendMessage(req, res),
    middleware: [messageContentValidation],
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/conversations/:conversationId/messages',
    handler: (req, res) => messagesController.getMessages(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/messages/:messageId',
    handler: (req, res) => messagesController.getMessage(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/messages/:messageId',
    handler: (req, res) => messagesController.editMessage(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/messages/:messageId',
    handler: (req, res) => messagesController.deleteMessage(req, res),
    requiresAuth: true,
  },

  // Reactions
  {
    method: 'POST',
    path: '/messages/:messageId/reactions',
    handler: (req, res) => messagesController.addReaction(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/messages/:messageId/reactions',
    handler: (req, res) => messagesController.removeReaction(req, res),
    requiresAuth: true,
  },

  // Read receipts
  {
    method: 'POST',
    path: '/conversations/:conversationId/read',
    handler: (req, res) => messagesController.markAsRead(req, res),
    requiresAuth: true,
  },

  // Pinning
  {
    method: 'POST',
    path: '/messages/:messageId/pin',
    handler: (req, res) => messagesController.pinMessage(req, res),
    requiresAuth: true,
  },

  // Typing indicators
  {
    method: 'POST',
    path: '/conversations/:conversationId/typing',
    handler: (req, res) => messagesController.setTyping(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/conversations/:conversationId/typing',
    handler: (req, res) => messagesController.getTypingUsers(req, res),
    requiresAuth: true,
  },
];
