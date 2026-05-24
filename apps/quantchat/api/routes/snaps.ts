// ============================================================================
// QuantChat API - Snaps Routes
// Send/receive snaps, snap streaks, snap map, memories
// ============================================================================

import { snapsController } from '../controllers/snaps-controller';
import type { RouteDefinition } from './auth';

export const snapRoutes: RouteDefinition[] = [
  // Snaps
  {
    method: 'POST',
    path: '/snaps',
    handler: (req, res) => snapsController.sendSnap(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/snaps/:snapId',
    handler: (req, res) => snapsController.getSnap(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/snaps/:snapId/open',
    handler: (req, res) => snapsController.openSnap(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/snaps/:snapId/replay',
    handler: (req, res) => snapsController.replaySnap(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/snaps/:snapId/screenshot',
    handler: (req, res) => snapsController.screenshot(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/snaps/sent',
    handler: (req, res) => snapsController.getSentSnaps(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/snaps/received',
    handler: (req, res) => snapsController.getReceivedSnaps(req, res),
    requiresAuth: true,
  },

  // Streaks
  {
    method: 'GET',
    path: '/streaks',
    handler: (req, res) => snapsController.getStreaks(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/streaks/:friendId',
    handler: (req, res) => snapsController.getStreak(req, res),
    requiresAuth: true,
  },

  // Memories
  {
    method: 'POST',
    path: '/snaps/:snapId/memories',
    handler: (req, res) => snapsController.saveToMemories(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/memories',
    handler: (req, res) => snapsController.getMemories(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/memories/:memoryId/favorite',
    handler: (req, res) => snapsController.toggleFavoriteMemory(req, res),
    requiresAuth: true,
  },
  {
    method: 'DELETE',
    path: '/memories/:memoryId',
    handler: (req, res) => snapsController.deleteMemory(req, res),
    requiresAuth: true,
  },
];
