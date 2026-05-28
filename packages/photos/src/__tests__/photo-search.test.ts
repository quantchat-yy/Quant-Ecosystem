import { describe, it, expect } from 'vitest';
import { PhotoSearch } from '../search/photo-search.js';
import { PhotoStore } from '../library/photo-store.js';
import { FaceEngine, NoOpFaceDetector } from '../ai/face-engine.js';

const bb = { x: 0, y: 0, width: 10, height: 10 };
const meta = { width: 100, height: 100, format: 'jpeg', size: 500 };

describe('PhotoSearch', () => {
  const search = new PhotoSearch();

  it('search scores face match at weight 4', () => {
    const store = new PhotoStore();
    const engine = new FaceEngine(new NoOpFaceDetector());
    const clusters = engine.clusterFaces([{ id: 'f1', boundingBox: bb, embedding: [1, 0, 0] }]);
    store.addPhoto({
      uri: 'a.jpg',
      timestamp: Date.now(),
      metadata: meta,
      faces: [{ id: 'f1', boundingBox: bb, embedding: [1, 0, 0] }],
      objects: [],
      tags: [],
    });
    const r = search.search({ faceClusterId: clusters[0]!.id }, store, engine);
    expect(r[0]!.score).toBe(4);
    expect(r[0]!.matchReasons).toContain('face');
  });

  it('search combines object+location signals', () => {
    const store = new PhotoStore();
    const engine = new FaceEngine(new NoOpFaceDetector());
    store.addPhoto({
      uri: 'b.jpg',
      timestamp: Date.now(),
      metadata: meta,
      faces: [],
      objects: [{ label: 'car', confidence: 0.9, boundingBox: bb, category: 'vehicles' }],
      tags: [],
      location: { lat: 19, lng: 72.8 },
    });
    const r = search.search(
      { objectLabel: 'car', location: { lat: 19, lng: 72.8 } },
      store,
      engine,
    );
    expect(r[0]!.score).toBe(5);
  });

  it('parseNaturalQuery maps Hindi keywords', () => {
    expect(search.parseNaturalQuery('samudra yatra').objectLabel).toBe('beach');
  });
});
