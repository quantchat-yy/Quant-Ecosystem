// ============================================================================
// QuantAds API - Creative Studio Routes
// ============================================================================

import { creativeStudioController } from '../controllers/creative-studio-controller';
import type { Request, Response, NextFunction } from '../middleware';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

export const creativeStudioRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/creative-studio/templates', handler: (req, res) => creativeStudioController.getTemplates(req, res), requiresAuth: true },
  { method: 'GET', path: '/creative-studio/templates/:id', handler: (req, res) => creativeStudioController.getTemplate(req, res), requiresAuth: true },
  { method: 'GET', path: '/creative-studio/projects', handler: (req, res) => creativeStudioController.getProjects(req, res), requiresAuth: true },
  { method: 'POST', path: '/creative-studio/projects', handler: (req, res) => creativeStudioController.createProject(req, res), requiresAuth: true },
  { method: 'PUT', path: '/creative-studio/projects/:id', handler: (req, res) => creativeStudioController.updateProject(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/creative-studio/projects/:id', handler: (req, res) => creativeStudioController.deleteProject(req, res), requiresAuth: true },
  { method: 'POST', path: '/creative-studio/export', handler: (req, res) => creativeStudioController.exportCreative(req, res), requiresAuth: true },
  { method: 'POST', path: '/creative-studio/generate-formats', handler: (req, res) => creativeStudioController.generateFormats(req, res), requiresAuth: true },
  { method: 'GET', path: '/creative-studio/assets', handler: (req, res) => creativeStudioController.getAssets(req, res), requiresAuth: true },
  { method: 'POST', path: '/creative-studio/assets', handler: (req, res) => creativeStudioController.uploadAsset(req, res), requiresAuth: true },
  { method: 'DELETE', path: '/creative-studio/assets/:id', handler: (req, res) => creativeStudioController.deleteAsset(req, res), requiresAuth: true },
];
