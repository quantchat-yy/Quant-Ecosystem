import type { FastifyRequest } from 'fastify';
import type { AuthContext } from '@quant/auth';

export interface AppConfig {
  port: number;
  host: string;
  logLevel: string;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitWindow: string;
  redisUrl?: string;
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  env: 'development' | 'production' | 'test';
}

export interface AuthenticatedRequest extends FastifyRequest {
  auth: AuthContext;
}
