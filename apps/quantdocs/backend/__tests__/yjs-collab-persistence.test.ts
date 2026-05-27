import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as Y from 'yjs';
import {
  PersistenceAdapter,
  type DatabaseClient,
  type DocumentVersion,
} from '../services/collab-persistence';

describe('PersistenceAdapter', () => {
  let adapter: PersistenceAdapter;
  let mockDb: DatabaseClient;
  let storedDocs: Map<string, Uint8Array>;
  let storedCheckpoints: DocumentVersion[];

  beforeEach(() => {
    storedDocs = new Map();
    storedCheckpoints = [];

    mockDb = {
      saveDocument: vi.fn(async (docId: string, state: Uint8Array) => {
        storedDocs.set(docId, new Uint8Array(state));
      }),
      loadDocument: vi.fn(async (docId: string) => {
        return storedDocs.get(docId) ?? null;
      }),
      listVersions: vi.fn(async (_docId: string) => {
        return storedCheckpoints;
      }),
      saveCheckpoint: vi.fn(
        async (docId: string, name: string, _state: Uint8Array, userId?: string) => {
          const version: DocumentVersion = {
            id: `v-${storedCheckpoints.length + 1}`,
            docId,
            name,
            createdAt: new Date(),
            userId,
          };
          storedCheckpoints.push(version);
          return version;
        },
      ),
    };

    adapter = new PersistenceAdapter(mockDb);
  });

  describe('save/load round-trip', () => {
    it('saves and loads document state correctly', async () => {
      // Create a Y.Doc with content
      const doc = new Y.Doc();
      const text = doc.getText('content');
      text.insert(0, 'Hello World');
      const state = Y.encodeStateAsUpdate(doc);

      // Save it
      await adapter.saveDoc('doc-1', state);
      expect(mockDb.saveDocument).toHaveBeenCalledWith('doc-1', state);

      // Load it back
      const loaded = await adapter.loadDoc('doc-1');
      expect(loaded).not.toBeNull();

      // Verify content
      const restoredDoc = new Y.Doc();
      Y.applyUpdate(restoredDoc, loaded!);
      expect(restoredDoc.getText('content').toString()).toBe('Hello World');

      doc.destroy();
      restoredDoc.destroy();
    });

    it('returns null for non-existent documents', async () => {
      const loaded = await adapter.loadDoc('non-existent');
      expect(loaded).toBeNull();
    });
  });

  describe('checkpoints', () => {
    it('creates a checkpoint and lists it', async () => {
      const doc = new Y.Doc();
      doc.getText('content').insert(0, 'Checkpoint content');
      const state = Y.encodeStateAsUpdate(doc);

      const version = await adapter.createCheckpoint('doc-1', 'Initial save', state, 'user-1');
      expect(version.docId).toBe('doc-1');
      expect(version.name).toBe('Initial save');
      expect(version.userId).toBe('user-1');

      const versions = await adapter.listVersions('doc-1');
      expect(versions.length).toBe(1);
      expect(versions[0].name).toBe('Initial save');

      doc.destroy();
    });

    it('creates multiple checkpoints', async () => {
      const doc = new Y.Doc();
      const text = doc.getText('content');

      text.insert(0, 'Version 1');
      const state1 = Y.encodeStateAsUpdate(doc);
      await adapter.createCheckpoint('doc-1', 'v1', state1);

      text.delete(0, text.length);
      text.insert(0, 'Version 2');
      const state2 = Y.encodeStateAsUpdate(doc);
      await adapter.createCheckpoint('doc-1', 'v2', state2);

      const versions = await adapter.listVersions('doc-1');
      expect(versions.length).toBe(2);

      doc.destroy();
    });
  });

  describe('persistence with YjsServer integration', () => {
    it('round-trip preserves complex document structure', async () => {
      const doc = new Y.Doc();
      const text = doc.getText('content');
      const map = doc.getMap('metadata');

      text.insert(0, 'Complex document with multiple types');
      map.set('title', 'Test Doc');
      map.set('version', 1);

      const state = Y.encodeStateAsUpdate(doc);
      await adapter.saveDoc('complex-doc', state);

      const loaded = await adapter.loadDoc('complex-doc');
      const restored = new Y.Doc();
      Y.applyUpdate(restored, loaded!);

      expect(restored.getText('content').toString()).toBe('Complex document with multiple types');
      expect(restored.getMap('metadata').get('title')).toBe('Test Doc');
      expect(restored.getMap('metadata').get('version')).toBe(1);

      doc.destroy();
      restored.destroy();
    });
  });
});
