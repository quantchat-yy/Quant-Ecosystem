// ============================================================================
// QuantChat API - Snaps Controller
// Send/receive snaps, snap streaks, memories
// ============================================================================

import type { Request, Response } from '../middleware';
import type { Snap, SnapStreak, SnapMemory, SnapRecipientStatus, SendSnapRequest } from '../../src/types';

// ============================================================================
// Snap Store (in-memory)
// ============================================================================

class SnapStore {
  private snaps: Map<string, Snap> = new Map();
  private streaks: Map<string, SnapStreak> = new Map();
  private memories: Map<string, SnapMemory[]> = new Map();

  async sendSnap(senderId: string, request: SendSnapRequest): Promise<Snap> {
    const snapId = `snap_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const statuses: SnapRecipientStatus[] = request.recipientIds.map(id => ({
      userId: id,
      status: 'pending' as const,
    }));

    const snap: Snap = {
      id: snapId,
      senderId,
      recipientIds: request.recipientIds,
      type: request.type,
      mediaUrl: request.mediaUrl,
      thumbnailUrl: `${request.mediaUrl}_thumb`,
      duration: request.duration,
      filters: request.filters || [],
      caption: request.caption,
      stickers: request.stickers || [],
      isReplayable: request.isReplayable ?? false,
      maxReplays: 1,
      replaysUsed: 0,
      expiresAfterView: 10,
      statuses,
      savedToMemories: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.snaps.set(snapId, snap);

    // Update streaks for each recipient
    for (const recipientId of request.recipientIds) {
      this.updateStreak(senderId, recipientId);
      // Mark as delivered
      const status = snap.statuses.find(s => s.userId === recipientId);
      if (status) {
        status.status = 'delivered';
        status.deliveredAt = new Date();
      }
    }

    return snap;
  }

  async getSnap(snapId: string): Promise<Snap | null> {
    return this.snaps.get(snapId) || null;
  }

  async openSnap(snapId: string, userId: string): Promise<Snap | null> {
    const snap = this.snaps.get(snapId);
    if (!snap) return null;

    const status = snap.statuses.find(s => s.userId === userId);
    if (!status || status.status === 'opened') return snap;

    status.status = 'opened';
    status.openedAt = new Date();
    snap.updatedAt = new Date();

    // Schedule expiry after view
    setTimeout(() => {
      const s = this.snaps.get(snapId);
      if (s) {
        const st = s.statuses.find(x => x.userId === userId);
        if (st && st.status === 'opened') {
          st.status = 'expired';
        }
      }
    }, snap.expiresAfterView * 1000);

    return snap;
  }

  async replaySnap(snapId: string, userId: string): Promise<Snap | null> {
    const snap = this.snaps.get(snapId);
    if (!snap || !snap.isReplayable) return null;
    if (snap.replaysUsed >= snap.maxReplays) return null;

    const status = snap.statuses.find(s => s.userId === userId);
    if (!status) return null;

    status.status = 'replayed';
    status.replayedAt = new Date();
    snap.replaysUsed++;
    snap.updatedAt = new Date();

    return snap;
  }

  async reportScreenshot(snapId: string, userId: string): Promise<void> {
    const snap = this.snaps.get(snapId);
    if (!snap) return;

    const status = snap.statuses.find(s => s.userId === userId);
    if (status) {
      status.status = 'screenshotted';
      status.screenshottedAt = new Date();
    }
  }

  async getUserSnaps(userId: string, type: 'sent' | 'received' = 'received'): Promise<Snap[]> {
    const snaps: Snap[] = [];
    for (const snap of this.snaps.values()) {
      if (type === 'sent' && snap.senderId === userId) {
        snaps.push(snap);
      } else if (type === 'received' && snap.recipientIds.includes(userId)) {
        snaps.push(snap);
      }
    }
    return snaps.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // --------------------------------------------------------------------------
  // Streaks
  // --------------------------------------------------------------------------

  private updateStreak(userId1: string, userId2: string): void {
    const streakKey = [userId1, userId2].sort().join(':');
    const existing = this.streaks.get(streakKey);

    if (existing) {
      existing.count++;
      existing.lastSnapAt = new Date();
      existing.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      existing.isAboutToExpire = false;
      if (existing.count > existing.longestStreak) {
        existing.longestStreak = existing.count;
      }
    } else {
      const streak: SnapStreak = {
        id: `streak_${streakKey}`,
        userIds: [userId1, userId2] as [string, string],
        count: 1,
        startedAt: new Date(),
        lastSnapAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isAboutToExpire: false,
        longestStreak: 1,
      };
      this.streaks.set(streakKey, streak);
    }
  }

  async getStreaks(userId: string): Promise<SnapStreak[]> {
    const streaks: SnapStreak[] = [];
    for (const streak of this.streaks.values()) {
      if (streak.userIds.includes(userId)) {
        // Check if about to expire (less than 4 hours remaining)
        const hoursLeft = (streak.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
        streak.isAboutToExpire = hoursLeft > 0 && hoursLeft < 4;
        streaks.push(streak);
      }
    }
    return streaks.sort((a, b) => b.count - a.count);
  }

  async getStreak(userId1: string, userId2: string): Promise<SnapStreak | null> {
    const streakKey = [userId1, userId2].sort().join(':');
    return this.streaks.get(streakKey) || null;
  }

  // --------------------------------------------------------------------------
  // Memories
  // --------------------------------------------------------------------------

  async saveToMemories(snapId: string, userId: string): Promise<SnapMemory | null> {
    const snap = this.snaps.get(snapId);
    if (!snap || snap.senderId !== userId) return null;

    const memory: SnapMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      snapId,
      mediaUrl: snap.mediaUrl,
      thumbnailUrl: snap.thumbnailUrl || snap.mediaUrl,
      type: snap.type,
      tags: [],
      isFavorite: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const userMemories = this.memories.get(userId) || [];
    userMemories.push(memory);
    this.memories.set(userId, userMemories);

    snap.savedToMemories = true;
    return memory;
  }

  async getMemories(userId: string, limit: number = 50): Promise<SnapMemory[]> {
    const memories = this.memories.get(userId) || [];
    return memories.slice(-limit).reverse();
  }

  async toggleFavorite(memoryId: string, userId: string): Promise<SnapMemory | null> {
    const memories = this.memories.get(userId) || [];
    const memory = memories.find(m => m.id === memoryId);
    if (!memory) return null;

    memory.isFavorite = !memory.isFavorite;
    memory.updatedAt = new Date();
    return memory;
  }

  async deleteMemory(memoryId: string, userId: string): Promise<boolean> {
    const memories = this.memories.get(userId) || [];
    const idx = memories.findIndex(m => m.id === memoryId);
    if (idx < 0) return false;

    memories.splice(idx, 1);
    this.memories.set(userId, memories);
    return true;
  }
}

const snapStore = new SnapStore();

// ============================================================================
// Snaps Controller
// ============================================================================

export class SnapsController {
  async sendSnap(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const body = req.body as SendSnapRequest;

    if (!body.recipientIds || body.recipientIds.length === 0 || !body.mediaUrl || !body.type) {
      res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Recipient IDs, media URL, and type are required', statusCode: 400 } });
      return;
    }

    const snap = await snapStore.sendSnap(userId, body);
    res.status(201).json({ success: true, data: snap });
  }

  async getSnap(req: Request, res: Response): Promise<void> {
    const snapId = req.params['snapId'];
    const snap = await snapStore.getSnap(snapId);

    if (!snap) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Snap not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: snap });
  }

  async openSnap(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const snapId = req.params['snapId'];

    const snap = await snapStore.openSnap(snapId, userId);
    if (!snap) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Snap not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: snap });
  }

  async replaySnap(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const snapId = req.params['snapId'];

    const snap = await snapStore.replaySnap(snapId, userId);
    if (!snap) {
      res.status(400).json({ success: false, error: { code: 'REPLAY_FAILED', message: 'Cannot replay snap', statusCode: 400 } });
      return;
    }

    res.status(200).json({ success: true, data: snap });
  }

  async screenshot(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const snapId = req.params['snapId'];
    await snapStore.reportScreenshot(snapId, userId);
    res.status(200).json({ success: true, data: { message: 'Screenshot reported' } });
  }

  async getSentSnaps(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const snaps = await snapStore.getUserSnaps(userId, 'sent');
    res.status(200).json({ success: true, data: snaps });
  }

  async getReceivedSnaps(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const snaps = await snapStore.getUserSnaps(userId, 'received');
    res.status(200).json({ success: true, data: snaps });
  }

  // Streaks
  async getStreaks(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const streaks = await snapStore.getStreaks(userId);
    res.status(200).json({ success: true, data: streaks });
  }

  async getStreak(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const friendId = req.params['friendId'];
    const streak = await snapStore.getStreak(userId, friendId);

    if (!streak) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No streak with this user', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: streak });
  }

  // Memories
  async saveToMemories(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const snapId = req.params['snapId'];

    const memory = await snapStore.saveToMemories(snapId, userId);
    if (!memory) {
      res.status(400).json({ success: false, error: { code: 'SAVE_FAILED', message: 'Cannot save to memories', statusCode: 400 } });
      return;
    }

    res.status(201).json({ success: true, data: memory });
  }

  async getMemories(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const limit = parseInt(req.query['limit'] as string) || 50;
    const memories = await snapStore.getMemories(userId, limit);
    res.status(200).json({ success: true, data: memories });
  }

  async toggleFavoriteMemory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const memoryId = req.params['memoryId'];

    const memory = await snapStore.toggleFavorite(memoryId, userId);
    if (!memory) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Memory not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: memory });
  }

  async deleteMemory(req: Request, res: Response): Promise<void> {
    const userId = req.userId!;
    const memoryId = req.params['memoryId'];

    const deleted = await snapStore.deleteMemory(memoryId, userId);
    if (!deleted) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Memory not found', statusCode: 404 } });
      return;
    }

    res.status(200).json({ success: true, data: { message: 'Memory deleted' } });
  }
}

export const snapsController = new SnapsController();
