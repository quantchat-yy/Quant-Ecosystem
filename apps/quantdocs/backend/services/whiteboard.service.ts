/**
 * WhiteboardService - Yjs-backed infinite canvas (tldraw-style).
 * Uses Y.Map for shapes and Y.Array for layer ordering.
 */
import * as Y from 'yjs';

export type ShapeType = 'rect' | 'ellipse' | 'line' | 'arrow' | 'text' | 'freehand' | 'image';

export interface Shape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  props?: Record<string, unknown>;
}

export class WhiteboardService {
  private readonly docs: Map<string, Y.Doc> = new Map();

  createCanvas(docId: string): Y.Doc {
    let doc = this.docs.get(docId);
    if (!doc) {
      doc = new Y.Doc();
      // Initialize shared types
      doc.getMap('shapes');
      doc.getArray('layers');
      this.docs.set(docId, doc);
    }
    return doc;
  }

  addShape(docId: string, shape: Shape): void {
    const doc = this.getDoc(docId);
    const shapes = doc.getMap('shapes');
    const layers = doc.getArray('layers');

    const shapeMap = new Y.Map();
    shapeMap.set('id', shape.id);
    shapeMap.set('type', shape.type);
    shapeMap.set('x', shape.x);
    shapeMap.set('y', shape.y);
    shapeMap.set('width', shape.width);
    shapeMap.set('height', shape.height);
    if (shape.rotation !== undefined) {
      shapeMap.set('rotation', shape.rotation);
    }
    if (shape.props) {
      const propsMap = new Y.Map();
      for (const [key, value] of Object.entries(shape.props)) {
        propsMap.set(key, value);
      }
      shapeMap.set('props', propsMap);
    }

    shapes.set(shape.id, shapeMap);
    layers.push([shape.id]);
  }

  updateShape(docId: string, shapeId: string, delta: Partial<Omit<Shape, 'id' | 'type'>>): boolean {
    const doc = this.getDoc(docId);
    const shapes = doc.getMap('shapes');
    const shapeMap = shapes.get(shapeId) as Y.Map<unknown> | undefined;

    if (!shapeMap) {
      return false;
    }

    if (delta.x !== undefined) shapeMap.set('x', delta.x);
    if (delta.y !== undefined) shapeMap.set('y', delta.y);
    if (delta.width !== undefined) shapeMap.set('width', delta.width);
    if (delta.height !== undefined) shapeMap.set('height', delta.height);
    if (delta.rotation !== undefined) shapeMap.set('rotation', delta.rotation);

    return true;
  }

  deleteShape(docId: string, shapeId: string): boolean {
    const doc = this.getDoc(docId);
    const shapes = doc.getMap('shapes');
    const layers = doc.getArray('layers');

    if (!shapes.has(shapeId)) {
      return false;
    }

    shapes.delete(shapeId);

    // Remove from layers
    for (let i = 0; i < layers.length; i++) {
      if (layers.get(i) === shapeId) {
        layers.delete(i);
        break;
      }
    }

    return true;
  }

  getShapes(docId: string): Shape[] {
    const doc = this.getDoc(docId);
    const shapes = doc.getMap('shapes');
    const result: Shape[] = [];

    shapes.forEach((value, _key) => {
      const shapeMap = value as Y.Map<unknown>;
      const shape: Shape = {
        id: shapeMap.get('id') as string,
        type: shapeMap.get('type') as ShapeType,
        x: shapeMap.get('x') as number,
        y: shapeMap.get('y') as number,
        width: shapeMap.get('width') as number,
        height: shapeMap.get('height') as number,
      };

      const rotation = shapeMap.get('rotation');
      if (rotation !== undefined) {
        shape.rotation = rotation as number;
      }

      result.push(shape);
    });

    return result;
  }

  getDoc(docId: string): Y.Doc {
    const doc = this.docs.get(docId);
    if (!doc) {
      return this.createCanvas(docId);
    }
    return doc;
  }

  encodeState(docId: string): Uint8Array {
    const doc = this.getDoc(docId);
    return Y.encodeStateAsUpdate(doc);
  }
}
