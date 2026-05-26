import * as Y from 'yjs';
import { z } from 'zod';

export const CRDTDocumentConfigSchema = z.object({
  documentId: z.string().min(1),
  gc: z.boolean().optional().default(true),
});

export type CRDTDocumentConfig = z.input<typeof CRDTDocumentConfigSchema>;

type CRDTDocumentConfigParsed = z.output<typeof CRDTDocumentConfigSchema>;

export type UpdateCallback = (update: Uint8Array, origin: unknown) => void;

export class CRDTDocument {
  private readonly doc: Y.Doc;
  private readonly config: CRDTDocumentConfigParsed;
  private readonly listeners: Set<UpdateCallback> = new Set();

  constructor(config: CRDTDocumentConfig) {
    this.config = CRDTDocumentConfigSchema.parse(config);
    this.doc = new Y.Doc({ gc: this.config.gc });
  }

  getText(name: string): Y.Text {
    return this.doc.getText(name);
  }

  getMap<T = unknown>(name: string): Y.Map<T> {
    return this.doc.getMap<T>(name);
  }

  getArray<T = unknown>(name: string): Y.Array<T> {
    return this.doc.getArray<T>(name);
  }

  applyUpdate(update: Uint8Array): void {
    Y.applyUpdate(this.doc, update);
  }

  getStateVector(): Uint8Array {
    return Y.encodeStateVector(this.doc);
  }

  encodeState(): Uint8Array {
    return Y.encodeStateAsUpdate(this.doc);
  }

  onUpdate(callback: UpdateCallback): () => void {
    const handler: UpdateCallback = (update, origin) => {
      callback(update, origin);
    };
    this.listeners.add(handler);
    this.doc.on('update', handler);
    return () => {
      this.listeners.delete(handler);
      this.doc.off('update', handler);
    };
  }

  destroy(): void {
    for (const handler of this.listeners) {
      this.doc.off('update', handler);
    }
    this.listeners.clear();
    this.doc.destroy();
  }
}
