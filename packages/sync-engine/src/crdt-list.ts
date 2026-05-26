import * as Y from 'yjs';

export type ListObserveCallback<T> = (event: {
  added: T[];
  deleted: number;
  delta: Y.YArrayEvent<T>['changes']['delta'];
}) => void;

export class CRDTList<T> {
  private readonly doc: Y.Doc;
  private readonly array: Y.Array<T>;

  constructor() {
    this.doc = new Y.Doc();
    this.array = this.doc.getArray<T>('shared');
  }

  push(item: T): void {
    this.array.push([item]);
  }

  insert(index: number, item: T): void {
    this.array.insert(index, [item]);
  }

  delete(index: number, length = 1): void {
    this.array.delete(index, length);
  }

  get(index: number): T | undefined {
    return this.array.get(index) as T | undefined;
  }

  toArray(): T[] {
    return this.array.toArray();
  }

  get length(): number {
    return this.array.length;
  }

  observe(callback: ListObserveCallback<T>): () => void {
    const handler = (event: Y.YArrayEvent<T>) => {
      const added: T[] = [];
      for (const item of event.changes.delta) {
        if (item.insert) {
          added.push(...(item.insert as T[]));
        }
      }
      callback({
        added,
        deleted: event.changes.deleted.size,
        delta: event.changes.delta,
      });
    };
    this.array.observe(handler);
    return () => {
      this.array.unobserve(handler);
    };
  }

  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update);
  }

  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }
}
