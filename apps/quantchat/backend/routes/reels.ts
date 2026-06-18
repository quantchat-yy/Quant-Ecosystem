// ============================================================================
// QuantChat - Reels Backend Routes
// GET /reels/feed, POST /reels/:id/like, POST /reels/:id/comment, POST /reels/:id/share
// ============================================================================
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Mock Data - 20 sample reels with realistic metadata
// ---------------------------------------------------------------------------
interface ReelData {
  id: string;
  creatorId: string;
  creatorUsername: string;
  creatorAvatar: string;
  videoUrl: string;
  thumbnailUrl: string;
  caption: string;
  duration: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  watchThroughRate: number;
  createdAt: string;
  isLikedByUser: boolean;
}

const MOCK_REELS: ReelData[] = Array.from({ length: 20 }, (_, i) => ({
  id: `reel-${String(i + 1).padStart(3, '0')}`,
  creatorId: `user-${String((i % 8) + 1).padStart(3, '0')}`,
  creatorUsername: [
    'cosmic_vibe',
    'neon_rider',
    'stellar_beats',
    'quantum_flow',
    'galaxy_girl',
    'astro_dj',
    'nebula_art',
    'void_dancer',
  ][i % 8]!,
  creatorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=user${(i % 8) + 1}`,
  videoUrl: `https://storage.quantchat.dev/reels/sample-${i + 1}.mp4`,
  thumbnailUrl: `https://storage.quantchat.dev/reels/thumb-${i + 1}.jpg`,
  caption: [
    'Vibing in the quantum realm #quantlife',
    'When the bass drops at lightspeed',
    'POV: You discovered anti-gravity',
    'This alien sunset hits different',
    'Day 365 of my intergalactic streak',
    'Tutorial: How to warp spacetime',
    'Wait for the drop... #mindblown',
    'My AI avatar just did THAT',
    'Duet this if you can keep up!',
    'The algorithm brought you here for a reason',
    'Crystalline vibes only',
    'Bioluminescent moments',
    'Cybernetic dreams',
    'When the stars align perfectly',
    'This beat is from another dimension',
    'Catch me on the Snap Map',
    'Streak check! Who is still going?',
    'New lens just dropped',
    'POV: Your avatar comes to life',
    'The future is now #quantchat',
  ][i]!,
  duration: Math.floor(Math.random() * 55) + 5,
  likeCount: Math.floor(Math.random() * 50000) + 100,
  commentCount: Math.floor(Math.random() * 5000) + 10,
  shareCount: Math.floor(Math.random() * 2000) + 5,
  watchThroughRate: Math.round((Math.random() * 0.6 + 0.3) * 100) / 100,
  createdAt: new Date(
    Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000),
  ).toISOString(),
  isLikedByUser: Math.random() > 0.7,
}));

// Schemas
const feedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

const commentBodySchema = z.object({
  text: z.string().min(1).max(500),
});

// Reel duration bounds (seconds) - mirrors client-side validation (Req 4.6).
const MIN_REEL_DURATION = 5;
const MAX_REEL_DURATION = 60;

const textOverlaySchema = z.object({
  id: z.string(),
  text: z.string().max(200),
  x: z.number(),
  y: z.number(),
  color: z.string(),
});

// POST /reels body - reel creation payload from the uploader.
const createReelBodySchema = z.object({
  videoUrl: z.string().min(1),
  thumbnailUrl: z.string().optional(),
  caption: z.string().max(2000).default(''),
  duration: z.number().min(MIN_REEL_DURATION).max(MAX_REEL_DURATION),
  coverFrameTimestamp: z.number().min(0).default(0),
  textOverlays: z.array(textOverlaySchema).default([]),
  creatorId: z.string().optional(),
  creatorUsername: z.string().optional(),
  creatorAvatar: z.string().optional(),
});

// In-memory state for likes/comments/shares (mock persistence)
const reelLikes = new Map<string, number>();
const reelComments = new Map<
  string,
  Array<{ id: string; userId: string; text: string; createdAt: string }>
>();
const reelShares = new Map<string, number>();

// Initialize from mock data
MOCK_REELS.forEach((r) => {
  reelLikes.set(r.id, r.likeCount);
  reelComments.set(r.id, []);
  reelShares.set(r.id, r.shareCount);
});

/**
 * Snapshot of the current reels merged with live like/comment/share counts.
 * Exposed for the Spotlight ranker (Task 13.5) so it can score reels by their
 * up-to-date engagement metrics without coupling to the in-memory stores.
 */
export function getRankableReels(): ReelData[] {
  return MOCK_REELS.map((reel) => ({
    ...reel,
    likeCount: reelLikes.get(reel.id) ?? reel.likeCount,
    shareCount: reelShares.get(reel.id) ?? reel.shareCount,
    commentCount: reel.commentCount + (reelComments.get(reel.id)?.length ?? 0),
  }));
}

export default async function reelsRoutes(fastify: FastifyInstance) {
  // GET /reels/feed?cursor=&limit= - Returns ranked reels array + nextCursor
  fastify.get('/feed', async (request, reply) => {
    const query = feedQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    const { cursor, limit } = query.data;

    // Determine starting index from cursor
    let startIndex = 0;
    if (cursor) {
      const cursorIndex = MOCK_REELS.findIndex((r) => r.id === cursor);
      if (cursorIndex >= 0) {
        startIndex = cursorIndex + 1;
      }
    }

    // Slice reels (pre-ranked by engagement score)
    const pageReels = MOCK_REELS.slice(startIndex, startIndex + limit).map((reel) => ({
      ...reel,
      likeCount: reelLikes.get(reel.id) ?? reel.likeCount,
      shareCount: reelShares.get(reel.id) ?? reel.shareCount,
      commentCount: reel.commentCount + (reelComments.get(reel.id)?.length ?? 0),
    }));

    const hasMore = startIndex + limit < MOCK_REELS.length;
    const nextCursor = hasMore ? (pageReels[pageReels.length - 1]?.id ?? null) : null;

    return reply.send({
      success: true,
      data: {
        reels: pageReels,
        nextCursor,
        hasMore,
        totalAvailable: MOCK_REELS.length,
      },
    });
  });

  // POST /reels/:id/like - Increments like count
  fastify.post('/:id/like', async (request, reply) => {
    const { id } = request.params as { id: string };

    const reel = MOCK_REELS.find((r) => r.id === id);
    if (!reel) {
      return reply.status(404).send({ error: 'Reel not found' });
    }

    const currentLikes = reelLikes.get(id) ?? reel.likeCount;
    reelLikes.set(id, currentLikes + 1);

    return reply.send({
      success: true,
      data: { id, likeCount: currentLikes + 1 },
    });
  });

  // POST /reels/:id/comment - Adds comment
  fastify.post('/:id/comment', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = commentBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ error: 'Invalid comment body' });
    }

    const reel = MOCK_REELS.find((r) => r.id === id);
    if (!reel) {
      return reply.status(404).send({ error: 'Reel not found' });
    }

    const comments = reelComments.get(id) ?? [];
    const newComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: 'current-user',
      text: body.data.text,
      createdAt: new Date().toISOString(),
    };
    comments.push(newComment);
    reelComments.set(id, comments);

    return reply.status(201).send({
      success: true,
      data: newComment,
    });
  });

  // POST /reels/:id/share - Increments share count
  fastify.post('/:id/share', async (request, reply) => {
    const { id } = request.params as { id: string };

    const reel = MOCK_REELS.find((r) => r.id === id);
    if (!reel) {
      return reply.status(404).send({ error: 'Reel not found' });
    }

    const currentShares = reelShares.get(id) ?? reel.shareCount;
    reelShares.set(id, currentShares + 1);

    return reply.send({
      success: true,
      data: { id, shareCount: currentShares + 1 },
    });
  });

  // POST /reels - Create a new reel (Task 4.5)
  // Validates duration (5-60s), creates the reel, and inserts it at the front
  // of the in-memory feed store so it is immediately discoverable (Task 4.6).
  fastify.post('/', async (request, reply) => {
    const body = createReelBodySchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        error: 'Invalid reel payload',
        details: body.error.flatten(),
      });
    }

    const { videoUrl, thumbnailUrl, caption, duration, creatorId, creatorUsername, creatorAvatar } =
      body.data;

    // Defense-in-depth duration validation (also enforced by the schema).
    if (duration < MIN_REEL_DURATION || duration > MAX_REEL_DURATION) {
      return reply.status(400).send({
        error: `Reel duration must be between ${MIN_REEL_DURATION} and ${MAX_REEL_DURATION} seconds`,
      });
    }

    const id = `reel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const newReel: ReelData = {
      id,
      creatorId: creatorId ?? 'current-user',
      creatorUsername: creatorUsername ?? 'you',
      creatorAvatar: creatorAvatar ?? 'https://api.dicebear.com/7.x/avataaars/svg?seed=you',
      videoUrl,
      thumbnailUrl: thumbnailUrl ?? `${videoUrl}#t=0.1`,
      caption,
      duration: Math.round(duration),
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      watchThroughRate: 0,
      createdAt: new Date().toISOString(),
      isLikedByUser: false,
    };

    // Task 4.6: insert at the front of the in-memory feed so the freshly
    // published reel surfaces in the feed immediately (well within 30s).
    MOCK_REELS.unshift(newReel);
    reelLikes.set(id, 0);
    reelComments.set(id, []);
    reelShares.set(id, 0);

    return reply.status(201).send({
      success: true,
      data: newReel,
    });
  });
}
