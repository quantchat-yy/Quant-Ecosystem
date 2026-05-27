/**
 * CodeCollabService - Realtime code editing support (CodeMirror 6 + Yjs adapter).
 * Uses Y.Text with language metadata for syntax-aware collaboration.
 *
 * NOTE: This service manages its own Y.Doc lifecycle independently of YjsServer.
 * Code documents are NOT persisted to Postgres/S3 and are NOT subject to the
 * eviction policy managed by YjsServer. This is acceptable for v1 where code
 * collaboration state is ephemeral/session-scoped. Future versions may route
 * code docs through YjsServer or accept PersistenceAdapter/StorageAdapter
 * options for durable storage.
 */
import * as Y from 'yjs';

export interface CodeDocMetadata {
  language: string;
  createdAt: Date;
}

export class CodeCollabService {
  private readonly docs: Map<string, Y.Doc> = new Map();
  private readonly metadata: Map<string, CodeDocMetadata> = new Map();

  createCodeDoc(docId: string, language: string): Y.Doc {
    let doc = this.docs.get(docId);
    if (!doc) {
      doc = new Y.Doc();
      doc.getText('code');
      this.docs.set(docId, doc);
      this.metadata.set(docId, {
        language,
        createdAt: new Date(),
      });
    }
    return doc;
  }

  getCodeContent(docId: string): string | null {
    const doc = this.docs.get(docId);
    if (!doc) {
      return null;
    }
    return doc.getText('code').toString();
  }

  applyCodeUpdate(docId: string, update: Uint8Array): void {
    let doc = this.docs.get(docId);
    if (!doc) {
      doc = new Y.Doc();
      doc.getText('code');
      this.docs.set(docId, doc);
    }
    Y.applyUpdate(doc, update);
  }

  getMetadata(docId: string): CodeDocMetadata | null {
    return this.metadata.get(docId) ?? null;
  }

  getDoc(docId: string): Y.Doc | null {
    return this.docs.get(docId) ?? null;
  }

  encodeState(docId: string): Uint8Array | null {
    const doc = this.docs.get(docId);
    if (!doc) {
      return null;
    }
    return Y.encodeStateAsUpdate(doc);
  }
}
