import type { CapabilityProvider } from './types.js';

export interface FileInfo {
  path: string;
  size: number;
  modified: number;
  isDirectory: boolean;
}

export interface FilesCapability extends CapabilityProvider<'files'> {
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array): Promise<void>;
  delete(path: string): Promise<void>;
  list(dir: string): Promise<FileInfo[]>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  getInfo(path: string): Promise<FileInfo>;
}
