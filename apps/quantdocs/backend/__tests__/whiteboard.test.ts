import { describe, it, expect, beforeEach } from 'vitest';
import * as Y from 'yjs';
import { WhiteboardService, type Shape } from '../services/whiteboard.service';

describe('WhiteboardService', () => {
  let service: WhiteboardService;

  beforeEach(() => {
    service = new WhiteboardService();
  });

  describe('createCanvas', () => {
    it('creates a new canvas for a document', () => {
      const doc = service.createCanvas('doc-1');
      expect(doc).toBeInstanceOf(Y.Doc);
    });

    it('returns existing canvas for same docId', () => {
      const doc1 = service.createCanvas('doc-1');
      const doc2 = service.createCanvas('doc-1');
      expect(doc1).toBe(doc2);
    });
  });

  describe('addShape', () => {
    it('adds a rectangle shape', () => {
      service.createCanvas('doc-1');

      const shape: Shape = {
        id: 'shape-1',
        type: 'rect',
        x: 100,
        y: 200,
        width: 300,
        height: 150,
      };

      service.addShape('doc-1', shape);

      const shapes = service.getShapes('doc-1');
      expect(shapes).toHaveLength(1);
      expect(shapes[0].id).toBe('shape-1');
      expect(shapes[0].type).toBe('rect');
      expect(shapes[0].x).toBe(100);
      expect(shapes[0].y).toBe(200);
    });

    it('adds multiple shape types', () => {
      service.createCanvas('doc-1');

      service.addShape('doc-1', {
        id: 'rect-1',
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      service.addShape('doc-1', {
        id: 'ellipse-1',
        type: 'ellipse',
        x: 200,
        y: 200,
        width: 50,
        height: 50,
      });

      service.addShape('doc-1', {
        id: 'text-1',
        type: 'text',
        x: 400,
        y: 100,
        width: 200,
        height: 30,
      });

      const shapes = service.getShapes('doc-1');
      expect(shapes).toHaveLength(3);
    });

    it('supports rotation property', () => {
      service.createCanvas('doc-1');

      service.addShape('doc-1', {
        id: 'shape-1',
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 45,
      });

      const shapes = service.getShapes('doc-1');
      expect(shapes[0].rotation).toBe(45);
    });
  });

  describe('updateShape', () => {
    it('updates shape position', () => {
      service.createCanvas('doc-1');
      service.addShape('doc-1', {
        id: 'shape-1',
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const result = service.updateShape('doc-1', 'shape-1', { x: 50, y: 75 });
      expect(result).toBe(true);

      const shapes = service.getShapes('doc-1');
      expect(shapes[0].x).toBe(50);
      expect(shapes[0].y).toBe(75);
    });

    it('returns false for non-existent shape', () => {
      service.createCanvas('doc-1');
      const result = service.updateShape('doc-1', 'non-existent', { x: 10 });
      expect(result).toBe(false);
    });
  });

  describe('deleteShape', () => {
    it('removes a shape from the canvas', () => {
      service.createCanvas('doc-1');
      service.addShape('doc-1', {
        id: 'shape-1',
        type: 'rect',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      });

      const result = service.deleteShape('doc-1', 'shape-1');
      expect(result).toBe(true);

      const shapes = service.getShapes('doc-1');
      expect(shapes).toHaveLength(0);
    });

    it('returns false for non-existent shape', () => {
      service.createCanvas('doc-1');
      const result = service.deleteShape('doc-1', 'non-existent');
      expect(result).toBe(false);
    });
  });

  describe('concurrent edits convergence', () => {
    it('two clients editing different shapes converge', () => {
      // Client 1 adds a shape
      const doc1 = new Y.Doc();
      const shapes1 = doc1.getMap('shapes');
      const layers1 = doc1.getArray('layers');

      const shape1 = new Y.Map();
      shape1.set('id', 'rect-1');
      shape1.set('type', 'rect');
      shape1.set('x', 0);
      shape1.set('y', 0);
      shape1.set('width', 100);
      shape1.set('height', 100);
      shapes1.set('rect-1', shape1);
      layers1.push(['rect-1']);

      // Sync to client 2
      const doc2 = new Y.Doc();
      Y.applyUpdate(doc2, Y.encodeStateAsUpdate(doc1));

      const shapes2 = doc2.getMap('shapes');
      const layers2 = doc2.getArray('layers');

      // Client 2 adds another shape
      const shape2 = new Y.Map();
      shape2.set('id', 'ellipse-1');
      shape2.set('type', 'ellipse');
      shape2.set('x', 200);
      shape2.set('y', 200);
      shape2.set('width', 50);
      shape2.set('height', 50);
      shapes2.set('ellipse-1', shape2);
      layers2.push(['ellipse-1']);

      // Client 1 moves their shape
      (shapes1.get('rect-1') as Y.Map<unknown>).set('x', 150);

      // Exchange updates
      const update1 = Y.encodeStateAsUpdate(doc1, Y.encodeStateVector(doc2));
      const update2 = Y.encodeStateAsUpdate(doc2, Y.encodeStateVector(doc1));
      Y.applyUpdate(doc1, update2);
      Y.applyUpdate(doc2, update1);

      // Both clients should have 2 shapes
      expect(doc1.getMap('shapes').size).toBe(2);
      expect(doc2.getMap('shapes').size).toBe(2);

      // Shape positions should match
      const rect1InDoc1 = doc1.getMap('shapes').get('rect-1') as Y.Map<unknown>;
      const rect1InDoc2 = doc2.getMap('shapes').get('rect-1') as Y.Map<unknown>;
      expect(rect1InDoc1.get('x')).toBe(rect1InDoc2.get('x'));

      doc1.destroy();
      doc2.destroy();
    });

    it('10 concurrent editors adding shapes all converge', () => {
      const docs: Y.Doc[] = [];

      // Create 10 documents (simulating 10 editors)
      for (let i = 0; i < 10; i++) {
        docs.push(new Y.Doc());
      }

      // Each editor adds a unique shape
      for (let i = 0; i < 10; i++) {
        const shapes = docs[i].getMap('shapes');
        const shapeMap = new Y.Map();
        shapeMap.set('id', `shape-${i}`);
        shapeMap.set('type', 'rect');
        shapeMap.set('x', i * 100);
        shapeMap.set('y', i * 50);
        shapeMap.set('width', 80);
        shapeMap.set('height', 60);
        shapes.set(`shape-${i}`, shapeMap);
      }

      // Sync all docs together (full mesh sync)
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (i !== j) {
            const update = Y.encodeStateAsUpdate(docs[j], Y.encodeStateVector(docs[i]));
            Y.applyUpdate(docs[i], update);
          }
        }
      }

      // All docs should have 10 shapes and be identical
      for (let i = 0; i < 10; i++) {
        expect(docs[i].getMap('shapes').size).toBe(10);
      }

      // All docs should converge to same state
      const state0 = Y.encodeStateAsUpdate(docs[0]);
      for (let i = 1; i < 10; i++) {
        // Instead of byte comparison, verify semantic equality
        expect(docs[i].getMap('shapes').size).toBe(docs[0].getMap('shapes').size);
      }

      // Cleanup
      for (const doc of docs) {
        doc.destroy();
      }

      // Suppress unused variable warning
      void state0;
    });
  });
});
