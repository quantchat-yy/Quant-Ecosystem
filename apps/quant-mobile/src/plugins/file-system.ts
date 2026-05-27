// File System Service - Native file system operations

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size: number;
  modifiedAt: number;
  createdAt: number;
}

export type Directory = 'documents' | 'cache' | 'data' | 'external' | 'temp';

export interface ReadOptions {
  encoding?: 'utf-8' | 'base64';
  directory?: Directory;
}

export interface WriteOptions {
  encoding?: 'utf-8' | 'base64';
  directory?: Directory;
  recursive?: boolean;
}

export class FileSystemService {
  private files: Map<string, { data: string; info: FileInfo }> = new Map();

  async readFile(path: string, _options?: ReadOptions): Promise<string> {
    const entry = this.files.get(this.normalizePath(path));
    if (!entry) {
      throw new Error(`File not found: ${path}`);
    }
    return entry.data;
  }

  async writeFile(path: string, data: string, _options?: WriteOptions): Promise<void> {
    const normalized = this.normalizePath(path);
    const now = Date.now();
    this.files.set(normalized, {
      data,
      info: {
        name: normalized.split('/').pop() ?? '',
        path: normalized,
        type: 'file',
        size: data.length,
        modifiedAt: now,
        createdAt: this.files.get(normalized)?.info.createdAt ?? now,
      },
    });
  }

  async deleteFile(path: string): Promise<void> {
    const normalized = this.normalizePath(path);
    if (!this.files.has(normalized)) {
      throw new Error(`File not found: ${path}`);
    }
    this.files.delete(normalized);
  }

  async listDir(path: string): Promise<FileInfo[]> {
    const normalized = this.normalizePath(path);
    const results: FileInfo[] = [];
    for (const [filePath, entry] of this.files) {
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      if (dir === normalized) {
        results.push(entry.info);
      }
    }
    return results;
  }

  async stat(path: string): Promise<FileInfo> {
    const normalized = this.normalizePath(path);
    const entry = this.files.get(normalized);
    if (!entry) {
      throw new Error(`File not found: ${path}`);
    }
    return entry.info;
  }

  async mkdir(path: string): Promise<void> {
    const normalized = this.normalizePath(path);
    const now = Date.now();
    this.files.set(normalized, {
      data: '',
      info: {
        name: normalized.split('/').pop() ?? '',
        path: normalized,
        type: 'directory',
        size: 0,
        modifiedAt: now,
        createdAt: now,
      },
    });
  }

  private normalizePath(path: string): string {
    return path.replace(/\/+/g, '/').replace(/\/$/, '');
  }
}
