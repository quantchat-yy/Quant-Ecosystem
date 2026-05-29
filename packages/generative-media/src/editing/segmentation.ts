import type { ObjectSegment } from '../types.js';

export class SegmentationEngine {
  segment(imageUri: string): ObjectSegment[] {
    return [
      {
        id: 'seg-001',
        label: 'person',
        confidence: 0.95,
        boundingBox: { x: 100, y: 50, width: 200, height: 400 },
        maskUri: `${imageUri}#mask-seg-001`,
      },
      {
        id: 'seg-002',
        label: 'background',
        confidence: 0.99,
        boundingBox: { x: 0, y: 0, width: 1024, height: 768 },
        maskUri: `${imageUri}#mask-seg-002`,
      },
    ];
  }

  segmentWithPrompt(imageUri: string, textPrompt: string): ObjectSegment[] {
    return [
      {
        id: `seg-prompt-001`,
        label: textPrompt,
        confidence: 0.88,
        boundingBox: { x: 150, y: 100, width: 300, height: 300 },
        maskUri: `${imageUri}#mask-prompt-001`,
      },
    ];
  }
}
