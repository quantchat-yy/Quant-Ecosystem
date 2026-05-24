// ============================================================================
// QuantAds API - Brand Safety Routes
// ============================================================================

import { brandSafetyController } from '../controllers/brand-safety-controller';
import type { Request, Response, NextFunction } from '../middleware';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

export const brandSafetyRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/brand-safety', handler: (req, res) => brandSafetyController.getSettings(req, res), requiresAuth: true },
  { method: 'PUT', path: '/brand-safety/settings', handler: (req, res) => brandSafetyController.updateSettings(req, res), requiresAuth: true },
  { method: 'GET', path: '/brand-safety/keywords', handler: (req, res) => brandSafetyController.getKeywords(req, res), requiresAuth: true },
  { method: 'POST', path: '/brand-safety/keywords', handler: (req, res) => brandSafetyController.addKeyword(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/brand-safety/keywords/:id', handler: (req, res) => brandSafetyController.removeKeyword(req, res), requiresAuth: true },
  { method: 'POST', path: '/brand-safety/classify', handler: (req, res) => brandSafetyController.classifyContent(req, res), requiresAuth: true },
  { method: 'POST', path: '/brand-safety/check-placement', handler: (req, res) => brandSafetyController.checkPlacement(req, res), requiresAuth: true },
  { method: 'GET', path: '/brand-safety/exclusions', handler: (req, res) => brandSafetyController.getExclusions(req, res), requiresAuth: true },
  { method: 'POST', path: '/brand-safety/exclusions', handler: (req, res) => brandSafetyController.addExclusion(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/brand-safety/exclusions/:id', handler: (req, res) => brandSafetyController.removeExclusion(req, res), requiresAuth: true },
  { method: 'PUT', path: '/brand-safety/inventory', handler: (req, res) => brandSafetyController.updateInventory(req, res), requiresAuth: true },
  { method: 'PUT', path: '/brand-safety/categories/:id', handler: (req, res) => brandSafetyController.updateCategory(req, res), requiresAuth: true },
];
