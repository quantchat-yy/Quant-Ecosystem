import type { EditResult, ObjectEditOperationType, ObjectSegment } from '../types.js';
import { SegmentationEngine } from './segmentation.js';

export class ObjectLevelEditor {
  private segmentation = new SegmentationEngine();

  async detectObjects(imageUri: string): Promise<ObjectSegment[]> {
    return this.segmentation.segment(imageUri);
  }

  async inpaint(imageUri: string, mask: string, prompt: string): Promise<EditResult> {
    const segments = await this.segmentation.segment(imageUri);
    return this.makeEditResult('inpaint', imageUri, segments, { mask, prompt });
  }

  async outpaint(
    imageUri: string,
    direction: 'left' | 'right' | 'up' | 'down',
    size: number,
    prompt: string,
  ): Promise<EditResult> {
    const segments = await this.segmentation.segment(imageUri);
    return this.makeEditResult('outpaint', imageUri, segments, { direction, size, prompt });
  }

  async removeObject(imageUri: string, segmentId: string): Promise<EditResult> {
    const segments = await this.segmentation.segment(imageUri);
    const target = segments.find((s) => s.id === segmentId);
    return this.makeEditResult('remove', imageUri, target ? [target] : [], { segmentId });
  }

  async applyStyleToObject(
    imageUri: string,
    segmentId: string,
    style: string,
  ): Promise<EditResult> {
    const segments = await this.segmentation.segment(imageUri);
    const target = segments.find((s) => s.id === segmentId);
    return this.makeEditResult('style-transfer', imageUri, target ? [target] : [], {
      segmentId,
      style,
    });
  }

  private makeEditResult(
    operation: ObjectEditOperationType,
    imageUri: string,
    segments: ObjectSegment[],
    metadata: Record<string, unknown>,
  ): EditResult {
    return {
      uri: `https://cdn.quant.app/edit/${operation}/${Date.now()}.png`,
      operation,
      segments,
      metadata: { sourceUri: imageUri, ...metadata },
    };
  }
}
