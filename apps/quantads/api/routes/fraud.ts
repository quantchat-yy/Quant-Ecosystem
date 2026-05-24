// ============================================================================
// QuantAds API - Fraud Detection Routes
// ============================================================================

import { fraudController } from '../controllers/fraud-controller';
import type { Request, Response, NextFunction } from '../middleware';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

export const fraudRoutes: RouteDefinition[] = [
  { method: 'GET', path: '/fraud/dashboard', handler: (req, res) => fraudController.getDashboard(req, res), requiresAuth: true },
  { method: 'GET', path: '/fraud/metrics', handler: (req, res) => fraudController.getMetrics(req, res), requiresAuth: true },
  { method: 'POST', path: '/fraud/score', handler: (req, res) => fraudController.scoreBotProbability(req, res), requiresAuth: true },
  { method: 'GET', path: '/fraud/ip/:ip', handler: (req, res) => fraudController.getIPReputation(req, res), requiresAuth: true },
  { method: 'POST', path: '/fraud/block-ip', handler: (req, res) => fraudController.blockIP(req, res), requiresAuth: true },
  { method: 'POST', path: '/fraud/analyze-clicks', handler: (req, res) => fraudController.analyzeClicks(req, res), requiresAuth: true },
  { method: 'GET', path: '/fraud/alerts', handler: (req, res) => fraudController.getAlerts(req, res), requiresAuth: true },
  { method: 'PUT', path: '/fraud/alerts/:id/resolve', handler: (req, res) => fraudController.resolveAlert(req, res), requiresAuth: true },
  { method: 'POST', path: '/fraud/viewability', handler: (req, res) => fraudController.trackViewability(req, res), requiresAuth: true },
];
