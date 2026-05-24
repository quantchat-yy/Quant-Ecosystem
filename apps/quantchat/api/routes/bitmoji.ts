// ============================================================================
// QuantChat API - Bitmoji Routes
// Custom avatar creation and sharing
// ============================================================================

import { bitmojiController } from '../controllers/bitmoji-controller';
import type { RouteDefinition } from './auth';

export const bitmojiRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/bitmoji',
    handler: (req, res) => bitmojiController.createBitmoji(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/bitmoji/me',
    handler: (req, res) => bitmojiController.getBitmoji(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/bitmoji',
    handler: (req, res) => bitmojiController.updateBitmoji(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/bitmoji/:userId',
    handler: (req, res) => bitmojiController.getBitmoji(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/bitmoji/outfit',
    handler: (req, res) => bitmojiController.setOutfit(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/bitmoji/outfits',
    handler: (req, res) => bitmojiController.getOutfits(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/bitmoji/:userId/expression/:expression',
    handler: (req, res) => bitmojiController.getExpression(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/bitmoji/customization-options',
    handler: (req, res) => bitmojiController.getCustomizationOptions(req, res),
    requiresAuth: true,
  },
];
