/**
 * PersistenceAdapter - Handles Postgres persistence for Yjs documents.
 * Uses an injectable database client interface for testability.
 */

export interface DatabaseClient {
  saveDocument(docId: string, state: Uint8Array): Promise<void>;
  loadDocument(docId: string): Promise<Uint8Array | null>;
  listVersions(docId: string): Promise<DocumentVersion[]>;
  saveCheckpoint(
    docId: string,
    name: string,
    state: Uint8Array,
    userId?: string,
  ): Promise<DocumentVersion>;
}

export interface DocumentVersion {
  id: string;
  docId: string;
  name: string;
  createdAt: Date;
  userId?: string;
}

export class PersistenceAdapter {
  constructor(private readonly db: DatabaseClient) {}

  async saveDoc(docId: string, state: Uint8Array): Promise<void> {
    await this.db.saveDocument(docId, state);
  }

  async loadDoc(docId: string): Promise<Uint8Array | null> {
    return this.db.loadDocument(docId);
  }

  async listVersions(docId: string): Promise<DocumentVersion[]> {
    return this.db.listVersions(docId);
  }

  async createCheckpoint(
    docId: string,
    name: string,
    state: Uint8Array,
    userId?: string,
  ): Promise<DocumentVersion> {
    return this.db.saveCheckpoint(docId, name, state, userId);
  }
}
