import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createAppError } from '@quant/server-core';
import { VideoProcessorService } from '../services/video-processor.service';

const uploadVideoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  visibility: z.enum(['PUBLIC', 'UNLISTED', 'PRIVATE']).optional(),
  tags: z.array(z.string()).optional(),
});

export default async function uploadRoutes(fastify: FastifyInstance) {
  const processor = new VideoProcessorService();

  fastify.post('/videos', async (request, reply) => {
    const parseResult = uploadVideoSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw parseResult.error;
    }

    const userId = (request as unknown as { auth: { userId: string } }).auth?.userId;
    if (!userId) {
      throw createAppError('Authentication required', 401, 'UNAUTHORIZED');
    }

    const { title, description, visibility, tags } = parseResult.data;

    // TODO: Get actual file from multipart upload
    const videoId = 'video_' + Date.now();
    const filePath = '/tmp/' + videoId; // Placeholder

    // Start async processing
    processor.processVideo(videoId, filePath).then((result) => {
      console.log('Video processing completed:', result);
    });

    return reply.send({
      success: true,
      videoId,
      title,
      status: 'processing',
      message: 'Video upload started. Processing will begin shortly.',
    });
  });
}
