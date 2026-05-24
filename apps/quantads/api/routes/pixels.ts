// ============================================================================
// QuantAds API - Pixels Routes
// ============================================================================

import { pixelsController } from '../controllers/pixels-controller';
import type { Request, Response, NextFunction } from '../middleware';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

export const pixelRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/pixels', handler: (req, res) => pixelsController.listPixels(req, res), requiresAuth: true },
  { method: 'POST', path: '/pixels', handler: (req, res) => pixelsController.createPixel(req, res), requiresAuth: true },
  { method: 'GET', path: '/pixels/:id', handler: (req, res) => pixelsController.getPixel(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/pixels/:id', handler: (req, res) => pixelsController.deletePixel(req, res), requiresAuth: true },
  { method: 'GET', path: '/pixels/:id/events', handler: (req, res) => pixelsController.getEvents(req, res), requiresAuth: true },
  { method: 'POST', path: '/pixels/:id/events', handler: (req, res) => pixelsController.ingestEvent(req, res), requiresAuth: false },
  { method: 'POST', path: '/pixels/:id/test', handler: (req, res) => pixelsController.testEvent(req, res), requiresAuth: true },
  { method: 'GET', path: '/pixels/:id/attribution', handler: (req, res) => pixelsController.getAttribution(req, res), requiresAuth: true },
];
