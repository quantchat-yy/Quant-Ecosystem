import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AwarenessService } from '../services/awareness.service';

describe('AwarenessService', () => {
  let service: AwarenessService;

  beforeEach(() => {
    service = new AwarenessService(30000);
  });

  describe('updateAwareness', () => {
    it('adds a client awareness state to a document', () => {
      service.updateAwareness('doc-1', 'client-1', {
        userId: 'user-1',
        cursor: { anchor: 5, head: 5 },
        user: { name: 'Alice', color: '#ff0000' },
      });

      const states = service.getAwareness('doc-1');
      expect(states).toHaveLength(1);
      expect(states[0].clientId).toBe('client-1');
      expect(states[0].userId).toBe('user-1');
      expect(states[0].user.name).toBe('Alice');
      expect(states[0].cursor).toEqual({ anchor: 5, head: 5 });
    });

    it('updates existing client state', () => {
      service.updateAwareness('doc-1', 'client-1', {
        userId: 'user-1',
        cursor: { anchor: 5, head: 5 },
        user: { name: 'Alice', color: '#ff0000' },
      });

      service.updateAwareness('doc-1', 'client-1', {
        userId: 'user-1',
        cursor: { anchor: 10, head: 15 },
        selection: { start: 10, end: 15 },
        user: { name: 'Alice', color: '#ff0000' },
      });

      const states = service.getAwareness('doc-1');
      expect(states).toHaveLength(1);
      expect(states[0].cursor).toEqual({ anchor: 10, head: 15 });
      expect(states[0].selection).toEqual({ start: 10, end: 15 });
    });

    it('supports multiple clients per document', () => {
      service.updateAwareness('doc-1', 'client-1', {
        userId: 'user-1',
        cursor: { anchor: 0, head: 0 },
        user: { name: 'Alice', color: '#ff0000' },
      });

      service.updateAwareness('doc-1', 'client-2', {
        userId: 'user-2',
        cursor: { anchor: 20, head: 20 },
        user: { name: 'Bob', color: '#00ff00' },
      });

      const states = service.getAwareness('doc-1');
      expect(states).toHaveLength(2);
    });
  });

  describe('removeClient', () => {
    it('removes a client from awareness', () => {
      service.updateAwareness('doc-1', 'client-1', {
        userId: 'user-1',
        cursor: { anchor: 0, head: 0 },
        user: { name: 'Alice', color: '#ff0000' },
      });

      service.removeClient('doc-1', 'client-1');

      const states = service.getAwareness('doc-1');
      expect(states).toHaveLength(0);
    });

    it('does nothing for non-existent client', () => {
      service.removeClient('doc-1', 'non-existent');
      const states = service.getAwareness('doc-1');
      expect(states).toHaveLength(0);
    });
  });

  describe('getAwareness', () => {
    it('returns empty array for unknown document', () => {
      const states = service.getAwareness('non-existent');
      expect(states).toEqual([]);
    });

    it('returns all client states for a document', () => {
      service.updateAwareness('doc-1', 'client-1', {
        userId: 'user-1',
        user: { name: 'Alice', color: '#ff0000' },
      });

      service.updateAwareness('doc-1', 'client-2', {
        userId: 'user-2',
        user: { name: 'Bob', color: '#00ff00' },
      });

      service.updateAwareness('doc-1', 'client-3', {
        userId: 'user-3',
        user: { name: 'Charlie', color: '#0000ff' },
      });

      const states = service.getAwareness('doc-1');
      expect(states).toHaveLength(3);
      expect(states.map((s) => s.userId).sort()).toEqual(['user-1', 'user-2', 'user-3']);
    });
  });

  describe('cleanupStaleClients', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('removes clients older than threshold', () => {
      service.updateAwareness('doc-1', 'client-1', {
        userId: 'user-1',
        user: { name: 'Alice', color: '#ff0000' },
      });

      // Advance time past the stale threshold
      vi.advanceTimersByTime(31000);

      const removed = service.cleanupStaleClients();
      expect(removed).toBe(1);
      expect(service.getAwareness('doc-1')).toHaveLength(0);
    });

    it('keeps fresh clients', () => {
      service.updateAwareness('doc-1', 'client-1', {
        userId: 'user-1',
        user: { name: 'Alice', color: '#ff0000' },
      });

      // Advance time but not past threshold
      vi.advanceTimersByTime(10000);

      const removed = service.cleanupStaleClients();
      expect(removed).toBe(0);
      expect(service.getAwareness('doc-1')).toHaveLength(1);
    });
  });
});
