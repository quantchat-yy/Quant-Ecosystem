import { describe, it, expect } from 'vitest';
import { ObjectEngine, mapLabelToCategory } from '../ai/object-engine.js';
import type { DetectedObject, ObjectDetector } from '../index.js';

const bb = { x: 0, y: 0, width: 10, height: 10 };
const mockDetector: ObjectDetector = {
  async detect() {
    return [
      { label: 'person', confidence: 0.95, boundingBox: bb, category: 'people' },
      { label: 'car', confidence: 0.6, boundingBox: bb, category: 'vehicles' },
    ];
  },
};

describe('ObjectEngine', () => {
  it('detectObjects returns from detector', async () => {
    expect(await new ObjectEngine(mockDetector).detectObjects('p.jpg')).toHaveLength(2);
  });

  it('categorizePhoto returns unique categories', () => {
    const objs: DetectedObject[] = [
      { label: 'person', confidence: 0.9, boundingBox: bb, category: 'people' },
      { label: 'dog', confidence: 0.8, boundingBox: bb, category: 'animals' },
      { label: 'cat', confidence: 0.7, boundingBox: bb, category: 'animals' },
    ];
    expect(new ObjectEngine(mockDetector).categorizePhoto(objs)).toEqual(['people', 'animals']);
  });

  it('filterByConfidence', () => {
    const objs: DetectedObject[] = [
      { label: 'person', confidence: 0.95, boundingBox: bb, category: 'people' },
      { label: 'car', confidence: 0.3, boundingBox: bb, category: 'vehicles' },
    ];
    expect(new ObjectEngine(mockDetector).filterByConfidence(objs, 0.5)).toHaveLength(1);
  });

  it('mapLabelToCategory', () => {
    expect(mapLabelToCategory('person')).toBe('people');
    expect(mapLabelToCategory('dog')).toBe('animals');
    expect(mapLabelToCategory('pizza')).toBe('food');
    expect(mapLabelToCategory('car')).toBe('vehicles');
    expect(mapLabelToCategory('sign')).toBe('text');
  });
});
