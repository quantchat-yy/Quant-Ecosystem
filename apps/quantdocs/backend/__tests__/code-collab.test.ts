import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { CodeCollabService } from '../services/code-collab.service';

describe('CodeCollabService', () => {
  let service: CodeCollabService;

  beforeEach(() => {
    service = new CodeCollabService();
  });

  describe('createCodeDoc', () => {
    it('creates a new code document with language metadata', () => {
      const doc = service.createCodeDoc('code-1', 'typescript');
      expect(doc).toBeInstanceOf(Y.Doc);

      const metadata = service.getMetadata('code-1');
      expect(metadata).not.toBeNull();
      expect(metadata!.language).toBe('typescript');
    });

    it('returns existing doc for same id', () => {
      const doc1 = service.createCodeDoc('code-1', 'typescript');
      const doc2 = service.createCodeDoc('code-1', 'typescript');
      expect(doc1).toBe(doc2);
    });
  });

  describe('getCodeContent', () => {
    it('returns null for non-existent doc', () => {
      expect(service.getCodeContent('non-existent')).toBeNull();
    });

    it('returns empty string for new doc', () => {
      service.createCodeDoc('code-1', 'typescript');
      expect(service.getCodeContent('code-1')).toBe('');
    });

    it('returns content after applying updates', () => {
      service.createCodeDoc('code-1', 'typescript');

      // Create an update that inserts code
      const helperDoc = new Y.Doc();
      const text = helperDoc.getText('code');
      text.insert(0, 'const x = 42;');

      const update = Y.encodeStateAsUpdate(helperDoc);
      service.applyCodeUpdate('code-1', update);

      expect(service.getCodeContent('code-1')).toBe('const x = 42;');

      helperDoc.destroy();
    });
  });

  describe('applyCodeUpdate', () => {
    it('creates doc on-the-fly if it does not exist', () => {
      const helperDoc = new Y.Doc();
      helperDoc.getText('code').insert(0, 'fn main() {}');
      const update = Y.encodeStateAsUpdate(helperDoc);

      service.applyCodeUpdate('new-code', update);

      expect(service.getCodeContent('new-code')).toBe('fn main() {}');

      helperDoc.destroy();
    });

    it('applies incremental updates', () => {
      service.createCodeDoc('code-1', 'javascript');

      // First update
      const doc1 = new Y.Doc();
      doc1.getText('code').insert(0, 'let a = 1;');
      service.applyCodeUpdate('code-1', Y.encodeStateAsUpdate(doc1));

      // Second update - append more code
      doc1.getText('code').insert(10, '\nlet b = 2;');
      const sv = Y.encodeStateVector(service.getDoc('code-1')!);
      const incrementalUpdate = Y.encodeStateAsUpdate(doc1, sv);
      service.applyCodeUpdate('code-1', incrementalUpdate);

      expect(service.getCodeContent('code-1')).toBe('let a = 1;\nlet b = 2;');

      doc1.destroy();
    });
  });

  describe('concurrent edits merge', () => {
    it('two editors modifying different parts of code converge', () => {
      // Editor 1 creates the file
      const editor1 = new Y.Doc();
      const text1 = editor1.getText('code');
      text1.insert(0, 'line 1\nline 2\nline 3');

      // Editor 2 syncs
      const editor2 = new Y.Doc();
      Y.applyUpdate(editor2, Y.encodeStateAsUpdate(editor1));
      const text2 = editor2.getText('code');

      // Editor 1 modifies line 1
      text1.delete(0, 6);
      text1.insert(0, 'modified line 1');

      // Editor 2 modifies line 3
      const line3Start = text2.toString().indexOf('line 3');
      text2.delete(line3Start, 6);
      text2.insert(line3Start, 'modified line 3');

      // Exchange updates
      const update1 = Y.encodeStateAsUpdate(editor1, Y.encodeStateVector(editor2));
      const update2 = Y.encodeStateAsUpdate(editor2, Y.encodeStateVector(editor1));
      Y.applyUpdate(editor1, update2);
      Y.applyUpdate(editor2, update1);

      // Both should converge
      expect(text1.toString()).toBe(text2.toString());
      expect(text1.toString()).toContain('modified line 1');
      expect(text1.toString()).toContain('modified line 3');

      editor1.destroy();
      editor2.destroy();
    });

    it('10 concurrent editors modifying code all converge', () => {
      const docs: Y.Doc[] = [];

      // Create base document
      const baseDoc = new Y.Doc();
      baseDoc.getText('code').insert(0, 'base code');
      const baseState = Y.encodeStateAsUpdate(baseDoc);

      // Create 10 editors starting from same base
      for (let i = 0; i < 10; i++) {
        const doc = new Y.Doc();
        Y.applyUpdate(doc, baseState);
        docs.push(doc);
      }

      // Each editor appends their own line
      for (let i = 0; i < 10; i++) {
        const text = docs[i].getText('code');
        text.insert(text.length, `\n// editor ${i}`);
      }

      // Full mesh sync
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (i !== j) {
            const update = Y.encodeStateAsUpdate(docs[j], Y.encodeStateVector(docs[i]));
            Y.applyUpdate(docs[i], update);
          }
        }
      }

      // All editors should have same content
      const finalContent = docs[0].getText('code').toString();
      for (let i = 1; i < 10; i++) {
        expect(docs[i].getText('code').toString()).toBe(finalContent);
      }

      // All 10 editor comments should be present
      for (let i = 0; i < 10; i++) {
        expect(finalContent).toContain(`// editor ${i}`);
      }

      // Cleanup
      baseDoc.destroy();
      for (const doc of docs) {
        doc.destroy();
      }
    });
  });

  describe('encodeState', () => {
    it('encodes and can restore state', () => {
      service.createCodeDoc('code-1', 'python');

      const helperDoc = new Y.Doc();
      helperDoc.getText('code').insert(0, 'print("hello")');
      service.applyCodeUpdate('code-1', Y.encodeStateAsUpdate(helperDoc));

      const state = service.encodeState('code-1');
      expect(state).not.toBeNull();

      // Verify state can restore content
      const restoredDoc = new Y.Doc();
      Y.applyUpdate(restoredDoc, state!);
      expect(restoredDoc.getText('code').toString()).toBe('print("hello")');

      helperDoc.destroy();
      restoredDoc.destroy();
    });

    it('returns null for non-existent doc', () => {
      expect(service.encodeState('non-existent')).toBeNull();
    });
  });
});
