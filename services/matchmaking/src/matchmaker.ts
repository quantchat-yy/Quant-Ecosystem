import { createAppError } from '@quant/server-core';
import { RoomServiceClient, AccessToken, type VideoGrant } from 'livekit-server-sdk';

export interface MatchmakingConfig {
  apiKey: string;
  apiSecret: string;
  wsUrl: string;
  queueTimeoutMs?: number;
}

export interface QueueEntry {
  userId: string;
  preferences: UserPreferences;
  joinedAt: number;
  timeoutHandle?: ReturnType<typeof setTimeout>;
}

export interface UserPreferences {
  gender?: string;
  language?: string;
  interests?: string[];
}

export interface PairResult {
  pairId: string;
  roomName: string;
  tokens: { userId: string; token: string }[];
}

export interface QueueStatus {
  queueSize: number;
  userInQueue: boolean;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export class MatchmakingService {
  private readonly roomClient: RoomServiceClient;
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly queue = new Map<string, QueueEntry>();
  private readonly timeoutMs: number;

  constructor(config: MatchmakingConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.roomClient = new RoomServiceClient(config.wsUrl, config.apiKey, config.apiSecret);
    this.timeoutMs = config.queueTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async joinQueue(userId: string, preferences: UserPreferences = {}): Promise<PairResult | null> {
    if (this.queue.has(userId)) {
      throw createAppError('User already in queue', 409, 'ALREADY_IN_QUEUE');
    }

    // Check for a compatible match in the queue
    const matchUserId = this.findCompatibleMatch(userId, preferences);

    if (matchUserId) {
      // Remove match from queue and pair them
      const matchEntry = this.queue.get(matchUserId)!;
      if (matchEntry.timeoutHandle) {
        clearTimeout(matchEntry.timeoutHandle);
      }
      this.queue.delete(matchUserId);

      return await this.createPair(userId, matchUserId);
    }

    // No match found; add to queue with timeout
    const entry: QueueEntry = {
      userId,
      preferences,
      joinedAt: Date.now(),
    };

    entry.timeoutHandle = setTimeout(() => {
      this.queue.delete(userId);
    }, this.timeoutMs);

    this.queue.set(userId, entry);
    return null;
  }

  leaveQueue(userId: string): boolean {
    const entry = this.queue.get(userId);
    if (!entry) {
      return false;
    }

    if (entry.timeoutHandle) {
      clearTimeout(entry.timeoutHandle);
    }
    this.queue.delete(userId);
    return true;
  }

  getQueueStatus(userId: string): QueueStatus {
    return {
      queueSize: this.queue.size,
      userInQueue: this.queue.has(userId),
    };
  }

  private findCompatibleMatch(userId: string, preferences: UserPreferences): string | null {
    for (const [candidateId, entry] of this.queue) {
      if (candidateId === userId) continue;

      if (this.isCompatible(preferences, entry.preferences)) {
        return candidateId;
      }
    }
    return null;
  }

  private isCompatible(a: UserPreferences, b: UserPreferences): boolean {
    // Language must match if both specify it
    if (a.language && b.language && a.language !== b.language) {
      return false;
    }
    return true;
  }

  private async createPair(userA: string, userB: string): Promise<PairResult> {
    const pairId = `pair_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const roomName = `max-random:${pairId}`;

    try {
      await this.roomClient.createRoom({
        name: roomName,
        maxParticipants: 2,
        emptyTimeout: 30,
      });
    } catch (err) {
      throw createAppError(
        `Failed to create matchmaking room: ${(err as Error).message}`,
        502,
        'MATCHMAKING_ROOM_FAILED',
      );
    }

    const tokenA = await this.generateToken(roomName, userA);
    const tokenB = await this.generateToken(roomName, userB);

    return {
      pairId,
      roomName,
      tokens: [
        { userId: userA, token: tokenA },
        { userId: userB, token: tokenB },
      ],
    };
  }

  /**
   * Generate a LiveKit access token for a matched random-chat participant.
   *
   * Token TTL: 30 minutes. Random chat sessions are ephemeral by design.
   * A short TTL limits exposure if a token is leaked and encourages users
   * to re-queue for new interactions rather than lingering in old rooms.
   */
  private async generateToken(roomName: string, userId: string): Promise<string> {
    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    };

    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: userId,
      name: userId,
      ttl: '30m',
    });
    token.addGrant(grant);

    return await token.toJwt();
  }

  async destroyRoom(roomName: string): Promise<void> {
    try {
      await this.roomClient.deleteRoom(roomName);
    } catch (err) {
      throw createAppError(
        `Failed to destroy matchmaking room: ${(err as Error).message}`,
        502,
        'MATCHMAKING_ROOM_DESTROY_FAILED',
      );
    }
  }
}
