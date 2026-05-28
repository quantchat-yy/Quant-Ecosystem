import { describe, it, expect } from 'vitest';
import { InferenceRuntime } from '../editors/inference-runtime.js';
import { MagicEraserPipeline } from '../editors/magic-eraser.js';

describe('MagicEraserPipeline', () => {
  it('returns error for empty photoUri', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const eraser = new MagicEraserPipeline(runtime);
    const result = await eraser.erase('', 'mask.png');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('returns error for empty maskUri', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const eraser = new MagicEraserPipeline(runtime);
    const result = await eraser.erase('photo.jpg', '');
    expect(result.success).toBe(false);
  });

  it('mock execution returns success with output URI', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const eraser = new MagicEraserPipeline(runtime);
    const result = await eraser.erase('photo.jpg', 'mask.png');
    expect(result.success).toBe(true);
    expect(result.outputUri).toBe('photo.jpg-erased');
  });

  it('uses server fallback when serverUrl provided and backend is mock', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const eraser = new MagicEraserPipeline(runtime, 'http://localhost:8080');
    const result = await eraser.erase('photo.jpg', 'mask.png');
    expect(result.success).toBe(true);
    expect(result.outputUri).toContain('http://localhost:8080');
  });
});
