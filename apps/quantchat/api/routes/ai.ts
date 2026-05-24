// ============================================================================
// QuantChat API - AI Routes
// Smart replies, message translation, content moderation, chatbot
// ============================================================================

import { aiController } from '../controllers/ai-controller';
import type { RouteDefinition } from './auth';

export const aiRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/ai/smart-replies',
    handler: (req, res) => aiController.getSmartReplies(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/translate',
    handler: (req, res) => aiController.translate(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/moderate',
    handler: (req, res) => aiController.moderate(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/chat',
    handler: (req, res) => aiController.chat(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/ai/chat/history',
    handler: (req, res) => aiController.getChatHistory(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/ai/chat/history',
    handler: (req, res) => aiController.clearChatHistory(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/stickers',
    handler: (req, res) => aiController.generateStickers(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/ai/caption',
    handler: (req, res) => aiController.generateCaption(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/ai/languages',
    handler: (req, res) => aiController.getSupportedLanguages(req, res),
    requiresAuth: true,
  },
];
