import { describe, it, expect, vi } from 'vitest';
import { CRDTDocument } from '../crdt-document.js';

describe('CRDTDocument', () => {
  it('should create a document with valid config', () => {
    const doc = new CRDTDocument({ documentId: 'test-doc' });
    expect(doc).toBeDefined();
    doc.destroy();
  });

  it('should reject invalid config', () => {
    expect(() => new CRDTDocument({ documentId: '' })).toThrow();
  });

  it('should get and edit a Y.Text', () => {
    const doc = new CRDTDocument({ documentId: 'text-doc' });
    const text = doc.getText('content');
    text.insert(0, 'Hello, World!');
    expect(text.toString()).toBe('Hello, World!');
    doc.destroy();
  });

  it('should get and use a Y.Map', () => {
    const doc = new CRDTDocument({ documentId: 'map-doc' });
    const map = doc.getMap<string>('settings');
    map.set('theme', 'dark');
    expect(map.get('theme')).toBe('dark');
    doc.destroy();
  });

  it('should get and use a Y.Array', () => {
    const doc = new CRDTDocument({ documentId: 'array-doc' });
    const arr = doc.getArray<number>('items');
    arr.push([1, 2, 3]);
    expect(arr.toArray()).toEqual([1, 2, 3]);
    doc.destroy();
  });

  it('should merge updates from two independent documents without conflict', () => {
    const doc1 = new CRDTDocument({ documentId: 'doc-a' });
    const doc2 = new CRDTDocument({ documentId: 'doc-b' });

    const text1 = doc1.getText('content');
    text1.insert(0, 'Hello');

    const text2 = doc2.getText('content');
    text2.insert(0, 'World');

    // Apply updates bidirectionally
    const update1 = doc1.encodeState();
    const update2 = doc2.encodeState();

    doc1.applyUpdate(update2);
    doc2.applyUpdate(update1);

    // Both docs should have the same content (merged)
    expect(doc1.getText('content').toString()).toBe(doc2.getText('content').toString());
    expect(doc1.getText('content').toString()).toContain('Hello');
    expect(doc1.getText('content').toString()).toContain('World');

    doc1.destroy();
    doc2.destroy();
  });

  it('should return a state vector', () => {
    const doc = new CRDTDocument({ documentId: 'sv-doc' });
    const text = doc.getText('content');
    text.insert(0, 'test');
    const sv = doc.getStateVector();
    expect(sv).toBeInstanceOf(Uint8Array);
    expect(sv.length).toBeGreaterThan(0);
    doc.destroy();
  });

  it('should encode and decode state roundtrip', () => {
    const doc1 = new CRDTDocument({ documentId: 'enc-doc' });
    const text1 = doc1.getText('content');
    text1.insert(0, 'encoded content');
    const map1 = doc1.getMap<number>('scores');
    map1.set('player1', 100);

    const state = doc1.encodeState();

    const doc2 = new CRDTDocument({ documentId: 'dec-doc' });
    doc2.applyUpdate(state);

    expect(doc2.getText('content').toString()).toBe('encoded content');
    expect(doc2.getMap<number>('scores').get('player1')).toBe(100);

    doc1.destroy();
    doc2.destroy();
  });

  it('should fire onUpdate callback on changes', () => {
    const doc = new CRDTDocument({ documentId: 'update-doc' });
    const callback = vi.fn();
    const unsub = doc.onUpdate(callback);

    const text = doc.getText('content');
    text.insert(0, 'change');

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]![0]).toBeInstanceOf(Uint8Array);

    unsub();
    text.insert(5, '!');
    expect(callback).toHaveBeenCalledTimes(1);

    doc.destroy();
  });
});
