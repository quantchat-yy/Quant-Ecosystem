/**
 * StorageAdapter - Handles S3-like snapshot storage for Yjs documents.
 * Uses an injectable S3 client interface for testability.
 */

export interface SnapshotMetadata {
  docId: string;
  version: string;
  createdAt: Date;
  sizeBytes: number;
  label?: string;
}

export interface S3Client {
  upload(key: string, data: Uint8Array, metadata: Record<string, string>): Promise<string>;
  download(key: string): Promise<Uint8Array | null>;
  list(prefix: string): Promise<SnapshotMetadata[]>;
}

export class StorageAdapter {
  constructor(private readonly s3: S3Client) {}

  async uploadSnapshot(
    docId: string,
    state: Uint8Array,
    metadata?: { label?: string; version?: string },
  ): Promise<SnapshotMetadata> {
    const version = metadata?.version ?? new Date().toISOString();
    const key = `snapshots/${docId}/${version}`;

    await this.s3.upload(key, state, {
      docId,
      version,
      label: metadata?.label ?? '',
    });

    return {
      docId,
      version,
      createdAt: new Date(),
      sizeBytes: state.byteLength,
      label: metadata?.label,
    };
  }

  async downloadSnapshot(docId: string, version?: string): Promise<Uint8Array | null> {
    if (version) {
      const key = `snapshots/${docId}/${version}`;
      return this.s3.download(key);
    }

    // Get the latest snapshot
    const snapshots = await this.listSnapshots(docId);
    if (snapshots.length === 0) {
      return null;
    }

    const latest = snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    const key = `snapshots/${docId}/${latest.version}`;
    return this.s3.download(key);
  }

  async listSnapshots(docId: string): Promise<SnapshotMetadata[]> {
    const prefix = `snapshots/${docId}/`;
    return this.s3.list(prefix);
  }
}
