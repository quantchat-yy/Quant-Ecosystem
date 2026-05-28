import { describe, it, expect } from 'vitest';
import { InferenceRuntime } from '../editors/inference-runtime.js';
import { UnblurPipeline } from '../editors/unblur.js';

describe('UnblurPipeline', () => {
  it('defaults to 2x scale', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const unblur = new UnblurPipeline(runtime);
    const result = await unblur.enhance('blurry.jpg');
    expect(result.success).toBe(true);
    expect(result.outputUri).toContain('-enhanced-x2');
  });

  it('supports 4x scale', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const unblur = new UnblurPipeline(runtime, 4);
    const result = await unblur.enhance('blurry.jpg');
    expect(result.success).toBe(true);
    expect(result.outputUri).toContain('-enhanced-x4');
  });

  it('throws for invalid scale factor', () => {
    const runtime = new InferenceRuntime(['mock']);
    expect(() => new UnblurPipeline(runtime, 3)).toThrow('Scale factor must be 2 or 4');
  });

  it('returns error for empty photoUri', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const unblur = new UnblurPipeline(runtime);
    const result = await unblur.enhance('');
    expect(result.success).toBe(false);
  });
});
