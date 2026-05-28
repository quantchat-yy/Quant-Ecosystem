import type { DetectedObject, ObjectCategory } from '../types.js';

export interface ObjectDetector {
  detect(imageUri: string): Promise<DetectedObject[]>;
}

export class NoOpObjectDetector implements ObjectDetector {
  async detect(_imageUri: string): Promise<DetectedObject[]> {
    return [];
  }
}

const CATEGORY_MAP: Record<string, ObjectCategory> = {
  person: 'people',
  dog: 'animals',
  cat: 'animals',
  bird: 'animals',
  pizza: 'food',
  cake: 'food',
  tree: 'nature',
  mountain: 'nature',
  beach: 'nature',
  car: 'vehicles',
  bus: 'vehicles',
  truck: 'vehicles',
  building: 'buildings',
  house: 'buildings',
  book: 'text',
  sign: 'text',
};

export function mapLabelToCategory(label: string): ObjectCategory {
  return CATEGORY_MAP[label.toLowerCase()] ?? 'nature';
}

export class ObjectEngine {
  constructor(private detector: ObjectDetector) {}
  async detectObjects(photoUri: string): Promise<DetectedObject[]> {
    return this.detector.detect(photoUri);
  }
  categorizePhoto(objects: DetectedObject[]): ObjectCategory[] {
    return [...new Set(objects.map((o) => o.category))];
  }
  filterByConfidence(objects: DetectedObject[], threshold: number): DetectedObject[] {
    return objects.filter((o) => o.confidence >= threshold);
  }
}
