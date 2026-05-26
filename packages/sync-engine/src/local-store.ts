export interface OfflineAction {
  id: string;
  type: string;
  payload: unknown;
  timestamp: number;
}

export interface IStorageBackend {
  get(key: string): Promise<Uint8Array | string | null>;
  set(key: string, value: Uint8Array | string): Promise<void>;
  delete(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export class InMemoryStorageBackend implements IStorageBackend {
  private readonly store: Map<string, Uint8Array | string> = new Map();

  async get(key: string): Promise<Uint8Array | string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: Uint8Array | string): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async keys(): Promise<string[]> {
    return [...this.store.keys()];
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

const DATA_PREFIX = 'data:';
const QUEUE_KEY = '__offline_queue__';

export class LocalStore {
  private readonly backend: IStorageBackend;

  constructor(backend: IStorageBackend) {
    this.backend = backend;
  }

  async save(key: string, data: Uint8Array | object): Promise<void> {
    const storeKey = `${DATA_PREFIX}${key}`;
    if (data instanceof Uint8Array) {
      await this.backend.set(storeKey, data);
    } else {
      await this.backend.set(storeKey, JSON.stringify(data));
    }
  }

  async load(key: string): Promise<Uint8Array | object | null> {
    const storeKey = `${DATA_PREFIX}${key}`;
    const raw = await this.backend.get(storeKey);
    if (raw === null) {
      return null;
    }
    if (raw instanceof Uint8Array) {
      return raw;
    }
    return JSON.parse(raw) as object;
  }

  async delete(key: string): Promise<void> {
    const storeKey = `${DATA_PREFIX}${key}`;
    await this.backend.delete(storeKey);
  }

  async listKeys(prefix?: string): Promise<string[]> {
    const allKeys = await this.backend.keys();
    const dataKeys = allKeys
      .filter((k) => k.startsWith(DATA_PREFIX))
      .map((k) => k.slice(DATA_PREFIX.length));

    if (prefix) {
      return dataKeys.filter((k) => k.startsWith(prefix));
    }
    return dataKeys;
  }

  async clear(): Promise<void> {
    await this.backend.clear();
  }

  async queueAction(action: OfflineAction): Promise<void> {
    const queue = await this.getQueuedActions();
    queue.push(action);
    await this.backend.set(QUEUE_KEY, JSON.stringify(queue));
  }

  async getQueuedActions(): Promise<OfflineAction[]> {
    const raw = await this.backend.get(QUEUE_KEY);
    if (raw === null) {
      return [];
    }
    if (typeof raw === 'string') {
      return JSON.parse(raw) as OfflineAction[];
    }
    return [];
  }

  async clearQueue(): Promise<void> {
    await this.backend.delete(QUEUE_KEY);
  }
}
