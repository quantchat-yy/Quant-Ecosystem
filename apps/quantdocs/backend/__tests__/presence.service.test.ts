import { describe, it, expect, beforeEach } from 'vitest';
import { PresenceService } from '../services/presence.service';

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    service = new PresenceService();
  });

  describe('setCursor', () => {
    it('stores cursor info for a user in a document', () => {
      service.setCursor('doc-1', 'user-1', { line: 5, column: 10 }, 'Alice', '#ff0000');

      const cursors = service.getCursors('doc-1');
      expect(cursors).toHaveLength(1);
      expect(cursors[0]).toEqual(
        expect.objectContaining({
          userId: 'user-1',
          name: 'Alice',
          color: '#ff0000',
          position: { line: 5, column: 10 },
        }),
      );
    });

    it('updates cursor position for same user', () => {
      service.setCursor('doc-1', 'user-1', { line: 1, column: 1 });
      service.setCursor('doc-1', 'user-1', { line: 10, column: 5 });

      const cursors = service.getCursors('doc-1');
      expect(cursors).toHaveLength(1);
      expect(cursors[0]!.position).toEqual({ line: 10, column: 5 });
    });
  });

  describe('getCursors', () => {
    it('returns all cursors for a document', () => {
      service.setCursor('doc-1', 'user-1', { line: 1, column: 1 }, 'Alice');
      service.setCursor('doc-1', 'user-2', { line: 3, column: 7 }, 'Bob');
      service.setCursor('doc-1', 'user-3', { line: 5, column: 2 }, 'Carol');

      const cursors = service.getCursors('doc-1');
      expect(cursors).toHaveLength(3);
    });

    it('returns empty array for document with no cursors', () => {
      const cursors = service.getCursors('nonexistent-doc');
      expect(cursors).toEqual([]);
    });
  });

  describe('removeCursor', () => {
    it('removes a user cursor from a document', () => {
      service.setCursor('doc-1', 'user-1', { line: 1, column: 1 });
      service.setCursor('doc-1', 'user-2', { line: 2, column: 2 });

      service.removeCursor('doc-1', 'user-1');

      const cursors = service.getCursors('doc-1');
      expect(cursors).toHaveLength(1);
      expect(cursors[0]!.userId).toBe('user-2');
    });

    it('does nothing when removing non-existent cursor', () => {
      service.removeCursor('doc-1', 'user-1');
      expect(service.getCursors('doc-1')).toEqual([]);
    });
  });

  describe('document isolation', () => {
    it('cursors are isolated between different documents', () => {
      service.setCursor('doc-1', 'user-1', { line: 1, column: 1 }, 'Alice');
      service.setCursor('doc-2', 'user-2', { line: 2, column: 2 }, 'Bob');

      const doc1Cursors = service.getCursors('doc-1');
      const doc2Cursors = service.getCursors('doc-2');

      expect(doc1Cursors).toHaveLength(1);
      expect(doc1Cursors[0]!.userId).toBe('user-1');

      expect(doc2Cursors).toHaveLength(1);
      expect(doc2Cursors[0]!.userId).toBe('user-2');
    });

    it('removing cursor from one doc does not affect another', () => {
      service.setCursor('doc-1', 'user-1', { line: 1, column: 1 });
      service.setCursor('doc-2', 'user-1', { line: 2, column: 2 });

      service.removeCursor('doc-1', 'user-1');

      expect(service.getCursors('doc-1')).toHaveLength(0);
      expect(service.getCursors('doc-2')).toHaveLength(1);
    });
  });
});
