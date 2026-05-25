export { createApp } from './app';
export { default as errorHandlerPlugin, createAppError, isAppError } from './plugins/error-handler';
export type { AppError } from './plugins/error-handler';
export { default as authPlugin } from './plugins/auth';
export type { RequireAuthOptions } from './plugins/auth';
export { default as healthPlugin } from './plugins/health';
export type { AppConfig, AuthenticatedRequest } from './types';
