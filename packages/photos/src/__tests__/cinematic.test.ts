import { describe, it, expect } from 'vitest';
import { InferenceRuntime } from '../editors/inference-runtime.js';
import { CinematicPipeline } from '../editors/cinematic.js';

describe('CinematicPipeline', () => {
  it('applies bokeh with default config', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const cinematic = new CinematicPipeline(runtime);
    const result = await cinematic.applyBokeh('scene.jpg');
    expect(result.success).toBe(true);
    expect(result.outputUri).toContain('-cinematic-');
  });

  it('generates depth map when not provided', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const cinematic = new CinematicPipeline(runtime, { focusDistance: 0.3, apertureStrength: 0.9 });
    const result = await cinematic.applyBokeh('scene.jpg');
    expect(result.success).toBe(true);
    expect(result.outputUri).toContain('f0.3');
    expect(result.outputUri).toContain('a0.9');
  });

  it('uses provided depth map', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const cinematic = new CinematicPipeline(runtime);
    const result = await cinematic.applyBokeh('scene.jpg', 'depth.png');
    expect(result.success).toBe(true);
  });

  it('returns error for empty photoUri', async () => {
    const runtime = new InferenceRuntime(['mock']);
    const cinematic = new CinematicPipeline(runtime);
    const result = await cinematic.applyBokeh('');
    expect(result.success).toBe(false);
  });
});
