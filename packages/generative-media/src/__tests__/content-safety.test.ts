import { ContentSafetyGate } from '../safety/content-safety.js';
import type { GenerationRequest } from '../types.js';

describe('ContentSafetyGate', () => {
  const gate = new ContentSafetyGate('strict');

  it('blocks NSFW content', () => {
    const req: GenerationRequest = { prompt: 'nude photo of a person', mediaType: 'image' };
    const result = gate.check(req);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain('nsfw_content');
  });

  it('blocks impersonation attempts', () => {
    const req: GenerationRequest = { prompt: 'create a deepfake video', mediaType: 'video' };
    const result = gate.check(req);
    expect(result.allowed).toBe(false);
    expect(result.reasons).toContain('impersonation');
  });

  it('allows valid creative prompts', () => {
    const req: GenerationRequest = {
      prompt: 'a beautiful mountain landscape at sunset',
      mediaType: 'image',
    };
    const result = gate.check(req);
    expect(result.allowed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('sensitivity levels affect blocking', () => {
    const permissive = new ContentSafetyGate('permissive');
    const req: GenerationRequest = { prompt: 'nude painting in art museum', mediaType: 'image' };
    const strictResult = gate.check(req);
    const permissiveResult = permissive.check(req);
    expect(strictResult.allowed).toBe(false);
    expect(permissiveResult.allowed).toBe(true);
  });
});
