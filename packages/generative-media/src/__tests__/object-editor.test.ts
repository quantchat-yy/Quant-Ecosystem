import { ObjectLevelEditor } from '../editing/object-editor.js';
import { SegmentationEngine } from '../editing/segmentation.js';

describe('SegmentationEngine', () => {
  const engine = new SegmentationEngine();

  it('segments an image returning object segments', () => {
    const segments = engine.segment('https://example.com/image.png');
    expect(segments.length).toBeGreaterThan(0);
    const first = segments[0]!;
    expect(first.id).toBeTruthy();
    expect(first.label).toBeTruthy();
    expect(first.confidence).toBeGreaterThan(0);
    expect(first.boundingBox).toBeDefined();
    expect(first.maskUri).toBeTruthy();
  });

  it('segments with text prompt', () => {
    const segments = engine.segmentWithPrompt('https://example.com/image.png', 'cat');
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0]!.label).toBe('cat');
  });
});

describe('ObjectLevelEditor', () => {
  let editor: ObjectLevelEditor;
  const testImage = 'https://cdn.quant.app/images/test.png';

  beforeEach(() => {
    editor = new ObjectLevelEditor();
  });

  it('detects objects in image', async () => {
    const segments = await editor.detectObjects(testImage);
    expect(segments.length).toBeGreaterThan(0);
    expect(segments[0]).toHaveProperty('id');
    expect(segments[0]).toHaveProperty('label');
    expect(segments[0]).toHaveProperty('confidence');
    expect(segments[0]).toHaveProperty('boundingBox');
  });

  it('performs inpaint operation', async () => {
    const result = await editor.inpaint(testImage, 'mask-data', 'fill with flowers');
    expect(result.operation).toBe('inpaint');
    expect(result.uri).toBeTruthy();
    expect(result.segments.length).toBeGreaterThan(0);
    expect(result.metadata).toHaveProperty('mask', 'mask-data');
    expect(result.metadata).toHaveProperty('prompt', 'fill with flowers');
  });

  it('performs outpaint operation', async () => {
    const result = await editor.outpaint(testImage, 'right', 256, 'extend the landscape');
    expect(result.operation).toBe('outpaint');
    expect(result.uri).toBeTruthy();
    expect(result.metadata).toHaveProperty('direction', 'right');
    expect(result.metadata).toHaveProperty('size', 256);
  });

  it('removes an object by segment id', async () => {
    const result = await editor.removeObject(testImage, 'seg-001');
    expect(result.operation).toBe('remove');
    expect(result.uri).toBeTruthy();
    expect(result.segments.length).toBe(1);
    expect(result.segments[0]!.id).toBe('seg-001');
  });

  it('applies style to object', async () => {
    const result = await editor.applyStyleToObject(testImage, 'seg-001', 'watercolor');
    expect(result.operation).toBe('style-transfer');
    expect(result.uri).toBeTruthy();
    expect(result.metadata).toHaveProperty('style', 'watercolor');
    expect(result.segments[0]!.id).toBe('seg-001');
  });

  it('throws for an unknown segment id', async () => {
    await expect(editor.removeObject(testImage, 'non-existent')).rejects.toThrow(
      /Segment not found: non-existent/,
    );
    await expect(editor.applyStyleToObject(testImage, 'non-existent', 'watercolor')).rejects.toThrow(
      /Segment not found: non-existent/,
    );
  });
});
