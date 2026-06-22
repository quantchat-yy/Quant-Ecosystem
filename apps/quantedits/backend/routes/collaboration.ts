import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { CollaborationService, ROLES } from '../services/collaboration.service';

// ============================================================================
// QuantEdit collaboration routes (mounted at /collaboration).
//
//   GET  /collaboration/:id/members   -> project collaborators
//   POST /collaboration/:id/invite    { userId, role }
//   GET  /collaboration/:id/comments  -> project comments
//   POST /collaboration/:id/comments  { content, layerId?, position? }
//
// All authenticated; access is gated by project membership (the first actor on
// a project is its implicit owner).
// ============================================================================

const inviteSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES as [string, ...string[]]),
});

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  layerId: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
});

function requireUserId(request: unknown): string {
  const userId = (request as { auth?: { userId?: string } }).auth?.userId;
  if (!userId) {
    throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
  }
  return userId;
}

export default async function collaborationRoutes(fastify: FastifyInstance) {
  const service = new CollaborationService((fastify as unknown as { prisma: never }).prisma);

  fastify.get<{ Params: { id: string } }>('/:id/members', async (request, reply) => {
    const userId = requireUserId(request);
    const members = await service.listMembers(request.params.id, userId);
    return reply.send({ success: true, data: members });
  });

  fastify.post<{ Params: { id: string } }>('/:id/invite', async (request, reply) => {
    const userId = requireUserId(request);
    const parsed = inviteSchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const member = await service.inviteCollaborator(request.params.id, userId, parsed.data);
    return reply.status(201).send({ success: true, data: member });
  });

  fastify.get<{ Params: { id: string } }>('/:id/comments', async (request, reply) => {
    const userId = requireUserId(request);
    const comments = await service.listComments(request.params.id, userId);
    return reply.send({ success: true, data: comments });
  });

  fastify.post<{ Params: { id: string } }>('/:id/comments', async (request, reply) => {
    const userId = requireUserId(request);
    const parsed = commentSchema.safeParse(request.body);
    if (!parsed.success) throw parsed.error;
    const comment = await service.addComment(request.params.id, userId, parsed.data);
    return reply.status(201).send({ success: true, data: comment });
  });
}
