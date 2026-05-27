import { describe, it, expect, beforeEach } from 'vitest';
import { HistoryService } from '../services/history.service';

describe('HistoryService', () => {
  let service: HistoryService;

  beforeEach(() => {
    service = new HistoryService();
  });

  describe('addToHistory', () => {
    it('adds an entry to watch history', async () => {
      const entry = await service.addToHistory('user-1', 'video-1', 60);

      expect(entry.userId).toBe('user-1');
      expect(entry.videoId).toBe('video-1');
      expect(entry.watchDuration).toBe(60);
    });

    it('updates existing entry for same user-video pair', async () => {
      await service.addToHistory('user-1', 'video-1', 30);
      const updated = await service.addToHistory('user-1', 'video-1', 90);

      expect(updated.watchDuration).toBe(90);

      const history = await service.getHistory('user-1');
      expect(history.total).toBe(1);
    });
  });

  describe('getHistory', () => {
    it('returns paginated history sorted by most recent', async () => {
      await service.addToHistory('user-1', 'video-1', 60);
      await service.addToHistory('user-1', 'video-2', 120);

      const result = await service.getHistory('user-1', { page: 1, pageSize: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('returns empty for user with no history', async () => {
      const result = await service.getHistory('user-1');

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('clearHistory', () => {
    it('removes all history for a user', async () => {
      await service.addToHistory('user-1', 'video-1', 60);
      await service.addToHistory('user-1', 'video-2', 120);

      await service.clearHistory('user-1');

      const result = await service.getHistory('user-1');
      expect(result.total).toBe(0);
    });
  });

  describe('removeFromHistory', () => {
    it('removes a specific entry from history', async () => {
      await service.addToHistory('user-1', 'video-1', 60);
      await service.addToHistory('user-1', 'video-2', 120);

      await service.removeFromHistory('user-1', 'video-1');

      const result = await service.getHistory('user-1');
      expect(result.total).toBe(1);
      expect(result.data[0].videoId).toBe('video-2');
    });

    it('does nothing if entry does not exist', async () => {
      await service.addToHistory('user-1', 'video-1', 60);

      await service.removeFromHistory('user-1', 'video-99');

      const result = await service.getHistory('user-1');
      expect(result.total).toBe(1);
    });
  });
});
