import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { VersionHistoryService } from '../services/version-history.service';

describe('VersionHistoryService', () => {
  let service: VersionHistoryService;

  beforeEach(() => {
    service = new VersionHistoryService();
  });

  describe('createCheckpoint', () => {
    it('creates a checkpoint with name and userId', () => {
      const doc = new Y.Doc();
      doc.getText('content').insert(0, 'First version');
      const state = Y.encodeStateAsUpdate(doc);

      const checkpoint = service.createCheckpoint('doc-1', 'Initial', 'user-1', state);

      expect(checkpoint.id).toBeDefined();
      expect(checkpoint.docId).toBe('doc-1');
      expect(checkpoint.name).toBe('Initial');
      expect(checkpoint.userId).toBe('user-1');
      expect(checkpoint.createdAt).toBeInstanceOf(Date);

      doc.destroy();
    });

    it('creates multiple checkpoints for same document', () => {
      const doc = new Y.Doc();
      const text = doc.getText('content');

      text.insert(0, 'Version 1');
      service.createCheckpoint('doc-1', 'v1', 'user-1', Y.encodeStateAsUpdate(doc));

      text.delete(0, text.length);
      text.insert(0, 'Version 2');
      service.createCheckpoint('doc-1', 'v2', 'user-1', Y.encodeStateAsUpdate(doc));

      text.delete(0, text.length);
      text.insert(0, 'Version 3');
      service.createCheckpoint('doc-1', 'v3', 'user-1', Y.encodeStateAsUpdate(doc));

      const checkpoints = service.listCheckpoints('doc-1');
      expect(checkpoints).toHaveLength(3);

      doc.destroy();
    });
  });

  describe('listCheckpoints', () => {
    it('returns empty array for unknown document', () => {
      const checkpoints = service.listCheckpoints('non-existent');
      expect(checkpoints).toEqual([]);
    });

    it('does not include state in listing', () => {
      const doc = new Y.Doc();
      doc.getText('content').insert(0, 'Content');
      service.createCheckpoint('doc-1', 'v1', 'user-1', Y.encodeStateAsUpdate(doc));

      const checkpoints = service.listCheckpoints('doc-1');
      expect(checkpoints[0]).not.toHaveProperty('state');

      doc.destroy();
    });
  });

  describe('restoreCheckpoint', () => {
    it('restores content to match the checkpoint', () => {
      const doc = new Y.Doc();
      const text = doc.getText('content');

      text.insert(0, 'Original content');
      const cp = service.createCheckpoint(
        'doc-1',
        'original',
        'user-1',
        Y.encodeStateAsUpdate(doc),
      );

      // Modify the doc further
      text.delete(0, text.length);
      text.insert(0, 'Modified content');

      // Restore from checkpoint
      const restoredState = service.restoreCheckpoint('doc-1', cp.id);
      expect(restoredState).not.toBeNull();

      const restoredDoc = new Y.Doc();
      Y.applyUpdate(restoredDoc, restoredState!);
      expect(restoredDoc.getText('content').toString()).toBe('Original content');

      doc.destroy();
      restoredDoc.destroy();
    });

    it('returns null for non-existent checkpoint', () => {
      const result = service.restoreCheckpoint('doc-1', 'non-existent');
      expect(result).toBeNull();
    });
  });

  describe('diffCheckpoints', () => {
    it('computes diff between two checkpoints', () => {
      const doc = new Y.Doc();
      const text = doc.getText('content');

      text.insert(0, 'Short');
      const cpA = service.createCheckpoint('doc-1', 'short', 'user-1', Y.encodeStateAsUpdate(doc));

      text.delete(0, text.length);
      text.insert(0, 'A much longer text than before');
      const cpB = service.createCheckpoint('doc-1', 'long', 'user-1', Y.encodeStateAsUpdate(doc));

      const diff = service.diffCheckpoints(cpA.id, cpB.id);
      expect(diff).not.toBeNull();
      expect(diff!.checkpointA).toBe(cpA.id);
      expect(diff!.checkpointB).toBe(cpB.id);
      expect(diff!.addedChars).toBeGreaterThan(0);

      doc.destroy();
    });

    it('returns null for non-existent checkpoints', () => {
      const diff = service.diffCheckpoints('non-a', 'non-b');
      expect(diff).toBeNull();
    });
  });
});
