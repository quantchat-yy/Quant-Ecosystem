import type { FastifyInstance } from 'fastify';
import { createAppError } from '@quant/server-core';
import { StorageQuotaService, STORAGE_TIERS } from '../services/storage-quota.service';

// ============================================================================
// QuantDrive storage routes (mounted at /storage).
//
//   GET /storage/quota -> the caller's used/limit bytes + tier
//
// Authenticated. Backs the previously-dead /api/storage/quota proxy.
// ============================================================================

function requireUserId(request: unknown): string {
  const userId = (request as { auth?: { userId?: string } }).auth?.userId;
  if (!userId) {
    throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

export default async function storageRoutes(fastify: FastifyInstance) {
  fastify.get('/quota', async (request, reply) => {
    const userId = requireUserId(request);
    const prisma = (fastify as unknown as { prisma: unknown }).prisma;
    const service = new StorageQuotaService(prisma as never);

    const [usedBytes, tier] = await Promise.all([
      service.getUsage(userId),
      service.getStorageTier(userId),
    ]);
    const limitBytes = STORAGE_TIERS[tier].limit;

    return reply.send({
      success: true,
      data: {
        userId,
        tier,
        usedBytes,
        limitBytes,
        percentUsed: limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0,
      },
    });
  });
}
