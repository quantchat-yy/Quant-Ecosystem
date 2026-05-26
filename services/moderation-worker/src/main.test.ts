import { describe, it, expect, vi } from 'vitest';
import { buildHandlerMap, routeJob } from './main';
import type { ModerationHandlerDeps } from './main';
import type { ModerationResult } from '@quant/moderation';
import type { ModerationJob } from '@quant/queue';

function createMockResult(contentType: string): ModerationResult {
  return {
    id: 'test_result',
    contentId: 'test-content-id',
    contentType: contentType as ModerationResult['contentType'],
    categories: [],
    overallScore: 0,
    action: 'approve',
    confidence: 0.95,
    automated: true,
    flags: [],
    metadata: {},
    createdAt: Date.now(),
  };
}

function createMockDeps(): ModerationHandlerDeps {
  return {
    textHandler: { handle: vi.fn().mockResolvedValue(createMockResult('text')) },
    imageHandler: { handle: vi.fn().mockResolvedValue(createMockResult('image')) },
    videoHandler: { handle: vi.fn().mockResolvedValue(createMockResult('video')) },
    audioHandler: { handle: vi.fn().mockResolvedValue(createMockResult('audio')) },
  } as unknown as ModerationHandlerDeps;
}

describe('buildHandlerMap', () => {
  it('returns a handler for text content type', () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    expect(handlers.has('text')).toBe(true);
  });

  it('returns a handler for image content type', () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    expect(handlers.has('image')).toBe(true);
  });

  it('returns a handler for video content type', () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    expect(handlers.has('video')).toBe(true);
  });

  it('returns a handler for audio content type', () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    expect(handlers.has('audio')).toBe(true);
  });

  it('returns correct number of handlers', () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    expect(handlers.size).toBe(4);
  });
});

describe('routeJob', () => {
  it('routes text content to text handler', async () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    const job: ModerationJob = {
      contentId: 'content-1',
      contentType: 'text',
      content: 'Hello world',
      userId: 'user-1',
      appId: 'app-1',
    };

    const result = await routeJob(handlers, job);
    expect(result.contentType).toBe('text');
    expect(deps.textHandler.handle).toHaveBeenCalledWith(job);
  });

  it('routes image content to image handler', async () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    const job: ModerationJob = {
      contentId: 'content-2',
      contentType: 'image',
      content: 'https://example.com/image.jpg',
      userId: 'user-1',
      appId: 'app-1',
    };

    const result = await routeJob(handlers, job);
    expect(result.contentType).toBe('image');
    expect(deps.imageHandler.handle).toHaveBeenCalledWith(job);
  });

  it('routes video content to video handler', async () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    const job: ModerationJob = {
      contentId: 'content-3',
      contentType: 'video',
      content: 'https://example.com/video.mp4',
      userId: 'user-1',
      appId: 'app-1',
    };

    const result = await routeJob(handlers, job);
    expect(result.contentType).toBe('video');
    expect(deps.videoHandler.handle).toHaveBeenCalledWith(job);
  });

  it('routes audio content to audio handler', async () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    const job: ModerationJob = {
      contentId: 'content-4',
      contentType: 'audio',
      content: 'https://example.com/audio.mp3',
      userId: 'user-1',
      appId: 'app-1',
    };

    const result = await routeJob(handlers, job);
    expect(result.contentType).toBe('audio');
    expect(deps.audioHandler.handle).toHaveBeenCalledWith(job);
  });

  it('throws error for unknown content type', async () => {
    const deps = createMockDeps();
    const handlers = buildHandlerMap(deps);
    const job = {
      contentId: 'content-5',
      contentType: 'unknown' as 'text',
      content: 'test',
      userId: 'user-1',
      appId: 'app-1',
    };

    await expect(routeJob(handlers, job)).rejects.toThrow(
      'No handler registered for content type: unknown',
    );
  });
});
