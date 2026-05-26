import * as Y from 'yjs';
import { z } from 'zod';

export type StateSubscribeCallback<T, K extends keyof T = keyof T> = (key: K, value: T[K]) => void;

export class CRDTState<T extends Record<string, unknown>> {
  private readonly doc: Y.Doc;
  private readonly map: Y.Map<unknown>;
  private readonly schema: z.ZodType<T>;
  private readonly subscribers: Map<keyof T, Set<StateSubscribeCallback<T>>> = new Map();

  constructor(schema: z.ZodType<T>) {
    this.schema = schema;
    this.doc = new Y.Doc();
    this.map = this.doc.getMap<unknown>('state');

    this.map.observe((event) => {
      for (const [key] of event.changes.keys) {
        const keyTyped = key as keyof T;
        const subs = this.subscribers.get(keyTyped);
        if (subs) {
          const value = this.map.get(key) as T[typeof keyTyped];
          for (const cb of subs) {
            cb(keyTyped, value);
          }
        }
      }
    });
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.map.get(key as string) as T[K];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    // Validate the individual field if the schema supports shape access
    const schema = this.schema as unknown as { shape?: Record<string, z.ZodType<unknown>> };
    if (schema.shape && key in schema.shape) {
      const fieldSchema = schema.shape[key as string];
      if (fieldSchema) {
        fieldSchema.parse(value);
      }
    }
    this.map.set(key as string, value);
  }

  subscribe<K extends keyof T>(key: K, callback: StateSubscribeCallback<T, K>): () => void {
    let subs = this.subscribers.get(key);
    if (!subs) {
      subs = new Set();
      this.subscribers.set(key, subs);
    }
    subs.add(callback as StateSubscribeCallback<T>);
    return () => {
      subs!.delete(callback as StateSubscribeCallback<T>);
      if (subs!.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  getSnapshot(): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.map.entries()) {
      result[key] = value;
    }
    return result as T;
  }

  applySnapshot(data: Partial<T>): void {
    this.doc.transact(() => {
      for (const [key, value] of Object.entries(data)) {
        this.map.set(key, value);
      }
    });
  }

  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update);
  }

  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }
}
