// ============================================================================
// @quant/database - Prisma Client, Repositories, and Schema Types
// ============================================================================

// Client
export { prisma, PrismaClient } from './client';
export type { Prisma } from './client';

// Transaction Helper
export { withTx } from './transaction';
export type { TransactionClient } from './transaction';

// Repositories
export {
  BaseRepository,
  UserRepository,
  MessageRepository,
  EmailRepository,
  PostRepository,
  MediaRepository,
  AISessionRepository,
  NotificationRepository,
} from './repositories';
export type { PaginationOptions, PaginatedResult } from './repositories';

// Schema Types (kept as documentation/validation types)
export * from './schemas/users';
export * from './schemas/messages';
export * from './schemas/emails';
export * from './schemas/posts';
export * from './schemas/ads';
export * from './schemas/media';
export * from './schemas/profiles';
export * from './schemas/ai-sessions';
export * from './schemas/notifications';
