import { describe, it, expect } from 'vitest';
import { FaceEngine } from '../ai/face-engine.js';
import { PhotoStore } from '../library/photo-store.js';
import type { Face, FaceDetector } from '../index.js';

const bb = { x: 0, y: 0, width: 10, height: 10 };
const mockDetector: FaceDetector = {
  async detect() {
    return [
      { id: 'f1', boundingBox: bb, embedding: [1, 0, 0] },
      { id: 'f2', boundingBox: bb, embedding: [0.98, 0.1, 0] },
    ];
  },
};

describe('FaceEngine', () => {
  it('detectFaces delegates to detector', async () => {
    const e = new FaceEngine(mockDetector);
    expect(await e.detectFaces('p.jpg')).toHaveLength(2);
  });

  it('clusterFaces groups similar embeddings', () => {
    const e = new FaceEngine(mockDetector);
    const faces: Face[] = [
      { id: 'a', boundingBox: bb, embedding: [1, 0, 0] },
      { id: 'b', boundingBox: bb, embedding: [0.95, 0.1, 0] },
      { id: 'c', boundingBox: bb, embedding: [0, 0, 1] },
    ];
    const clusters = e.clusterFaces(faces);
    expect(clusters).toHaveLength(2);
    expect(clusters[0]!.faceIds).toContain('a');
    expect(clusters[0]!.faceIds).toContain('b');
  });

  it('nameCluster and getPhotosForPerson', () => {
    const e = new FaceEngine(mockDetector);
    const store = new PhotoStore();
    const clusters = e.clusterFaces([{ id: 'x1', boundingBox: bb, embedding: [1, 0, 0] }]);
    e.nameCluster(clusters[0]!.id, 'Alice');
    store.addPhoto({
      uri: 'a.jpg',
      timestamp: Date.now(),
      metadata: { width: 100, height: 100, format: 'jpeg', size: 500 },
      faces: [{ id: 'x1', boundingBox: bb, embedding: [1, 0, 0] }],
      objects: [],
      tags: [],
    });
    expect(e.getPhotosForPerson('Alice', store)).toHaveLength(1);
  });
});
