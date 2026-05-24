// ============================================================================
// QuantChat API - Auth Routes
// Phone number registration/verification, OTP, QuantMail SSO link
// ============================================================================

import { authController } from '../controllers/auth-controller';
import type { Request, Response, NextFunction } from '../middleware';
import { RateLimiter } from '../middleware';

export interface RouteDefinition {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: (req: Request, res: Response) => Promise<void>;
  middleware?: Array<(req: Request, res: Response, next: NextFunction) => void>;
  requiresAuth?: boolean;
}

const otpLimiter = new RateLimiter({ windowMs: 60 * 1000, maxRequests: 3, message: 'Too many OTP requests' });
const verifyLimiter = new RateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 10, message: 'Too many verification attempts' });

export const authRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    path: '/auth/otp/request',
    handler: (req, res) => authController.requestOTP(req, res),
    middleware: [otpLimiter.middleware()],
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/auth/otp/verify',
    handler: (req, res) => authController.verifyOTP(req, res),
    middleware: [verifyLimiter.middleware()],
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/auth/link-quantmail',
    handler: (req, res) => authController.linkQuantMail(req, res),
    requiresAuth: true,
  },
  {
    method: 'POST',
    path: '/auth/refresh',
    handler: (req, res) => authController.refreshToken(req, res),
    requiresAuth: false,
  },
  {
    method: 'POST',
    path: '/auth/logout',
    handler: (req, res) => authController.logout(req, res),
    requiresAuth: true,
  },
  {
    method: 'GET',
    path: '/auth/profile',
    handler: (req, res) => authController.getProfile(req, res),
    requiresAuth: true,
  },
  {
    method: 'PUT',
    path: '/auth/profile',
    handler: (req, res) => authController.updateProfile(req, res),
    requiresAuth: true,
  },
];
