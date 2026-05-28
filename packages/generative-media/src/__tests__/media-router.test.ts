import { MediaRouter } from '../router/media-router.js';
import type { ProviderConfig, GenerationRequest } from '../types.js';

const providers: ProviderConfig[] = [
  {
    id: 'sd3',
    name: 'SD3',
    mediaType: 'image',
    priority: 'self-hosted',
    available: true,
    costPerUnit: 0.02,
    selfHosted: true,
  },
  {
    id: 'flux',
    name: 'FLUX',
    mediaType: 'image',
    priority: 'commercial',
    available: true,
    costPerUnit: 0.05,
    selfHosted: false,
  },
  {
    id: 'opensora',
    name: 'Open-Sora',
    mediaType: 'video',
    priority: 'self-hosted',
    available: true,
    costPerUnit: 0.1,
    selfHosted: true,
  },
  {
    id: 'runway',
    name: 'Runway',
    mediaType: 'video',
    priority: 'commercial',
    available: true,
    costPerUnit: 0.2,
    selfHosted: false,
  },
  {
    id: 'musicgen',
    name: 'MusicGen',
    mediaType: 'music',
    priority: 'self-hosted',
    available: true,
    costPerUnit: 0.05,
    selfHosted: true,
  },
  {
    id: 'unavailable',
    name: 'Down',
    mediaType: 'image',
    priority: 'self-hosted',
    available: false,
    costPerUnit: 0.01,
    selfHosted: true,
  },
];

describe('MediaRouter', () => {
  const router = new MediaRouter(providers);

  it('routes image request to image provider', () => {
    const req: GenerationRequest = { prompt: 'a cat', mediaType: 'image' };
    const result = router.route(req);
    expect(result).not.toBeNull();
    expect(result!.mediaType).toBe('image');
  });

  it('routes video request to video provider', () => {
    const req: GenerationRequest = { prompt: 'ocean waves', mediaType: 'video' };
    const result = router.route(req);
    expect(result).not.toBeNull();
    expect(result!.mediaType).toBe('video');
  });

  it('prefers self-hosted over commercial', () => {
    const req: GenerationRequest = { prompt: 'sunset', mediaType: 'image' };
    const result = router.route(req);
    expect(result!.priority).toBe('self-hosted');
  });

  it('falls back when primary unavailable', () => {
    const req: GenerationRequest = { prompt: 'a dog', mediaType: 'image' };
    const result = router.fallback(req, 'sd3');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('flux');
  });

  it('respects budget constraint', () => {
    const req: GenerationRequest = { prompt: 'wave', mediaType: 'video', maxBudget: 0.15 };
    const result = router.route(req);
    expect(result).not.toBeNull();
    expect(result!.costPerUnit).toBeLessThanOrEqual(0.15);
  });

  it('returns null when no providers available', () => {
    const req: GenerationRequest = { prompt: 'hello', mediaType: 'voice' };
    const result = router.route(req);
    expect(result).toBeNull();
  });
});
