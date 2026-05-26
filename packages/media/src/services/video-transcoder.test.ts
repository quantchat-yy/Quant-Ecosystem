// ============================================================================
// Media - Video Transcoder Tests
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VideoTranscoder, TranscodeOptionsSchema } from './video-transcoder';

// Mock fluent-ffmpeg
vi.mock('fluent-ffmpeg', () => {
  const mockFfprobe = vi.fn((_path: string, cb: (err: Error | null, data: unknown) => void) => {
    cb(null, { format: { duration: 120 }, streams: [] });
  });

  const createMockCommand = () => {
    const command: Record<string, unknown> = {};
    command.videoCodec = vi.fn(() => command);
    command.audioCodec = vi.fn(() => command);
    command.size = vi.fn(() => command);
    command.videoBitrate = vi.fn(() => command);
    command.audioBitrate = vi.fn(() => command);
    command.addOptions = vi.fn(() => command);
    command.output = vi.fn(() => command);
    command.frames = vi.fn(() => command);
    command.seekInput = vi.fn(() => command);
    command.on = vi.fn((event: string, handler: () => void) => {
      if (event === 'end') {
        (command as Record<string, unknown>)._endHandler = handler;
      }
      return command;
    });
    command.run = vi.fn(() => {
      const endHandler = (command as Record<string, (() => void) | undefined>)._endHandler;
      if (endHandler) {
        endHandler();
      }
    });
    return command;
  };

  const ffmpegFn = Object.assign(
    vi.fn(() => createMockCommand()),
    {
      setFfmpegPath: vi.fn(),
      ffprobe: mockFfprobe,
    },
  );

  return { default: ffmpegFn };
});

// Mock @ffmpeg-installer/ffmpeg
vi.mock('@ffmpeg-installer/ffmpeg', () => ({
  default: { path: '/usr/bin/ffmpeg' },
}));

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe('VideoTranscoder', () => {
  let transcoder: VideoTranscoder;

  beforeEach(() => {
    vi.clearAllMocks();
    transcoder = new VideoTranscoder();
  });

  describe('TranscodeOptionsSchema validation', () => {
    it('should validate correct options', () => {
      const result = TranscodeOptionsSchema.parse({
        inputPath: '/videos/input.mp4',
        outputDir: '/output/hls',
        segmentDuration: 10,
      });
      expect(result.inputPath).toBe('/videos/input.mp4');
      expect(result.outputDir).toBe('/output/hls');
      expect(result.segmentDuration).toBe(10);
    });

    it('should reject empty inputPath', () => {
      expect(() => TranscodeOptionsSchema.parse({ inputPath: '', outputDir: '/out' })).toThrow();
    });

    it('should reject empty outputDir', () => {
      expect(() => TranscodeOptionsSchema.parse({ inputPath: '/in.mp4', outputDir: '' })).toThrow();
    });

    it('should use default segmentDuration of 6', () => {
      const result = TranscodeOptionsSchema.parse({
        inputPath: '/in.mp4',
        outputDir: '/out',
      });
      expect(result.segmentDuration).toBe(6);
    });
  });

  describe('transcode', () => {
    it('should transcode to default profiles when none provided', async () => {
      const result = await transcoder.transcode({
        inputPath: '/videos/test.mp4',
        outputDir: '/output/hls',
      });

      expect(result.masterPlaylistPath).toBe('/output/hls/master.m3u8');
      expect(result.variants).toHaveLength(3);
      expect(result.variants[0]!.name).toBe('360p');
      expect(result.variants[1]!.name).toBe('720p');
      expect(result.variants[2]!.name).toBe('1080p');
      expect(result.duration).toBe(120);
    });

    it('should transcode with custom profiles', async () => {
      const result = await transcoder.transcode({
        inputPath: '/videos/test.mp4',
        outputDir: '/output/hls',
        profiles: [
          { name: '480p', width: 854, height: 480, videoBitrate: '1500k', audioBitrate: '128k' },
        ],
      });

      expect(result.variants).toHaveLength(1);
      expect(result.variants[0]!.name).toBe('480p');
      expect(result.variants[0]!.resolution).toBe('854x480');
    });

    it('should create output directories', async () => {
      const { mkdir } = await import('node:fs/promises');
      await transcoder.transcode({
        inputPath: '/videos/test.mp4',
        outputDir: '/output/hls',
      });

      expect(mkdir).toHaveBeenCalled();
    });
  });

  describe('generateHLS', () => {
    it('should generate HLS with default segment duration', async () => {
      const result = await transcoder.generateHLS('/videos/input.mp4', '/output/hls');

      expect(result).toBe('/output/hls/playlist.m3u8');
    });

    it('should generate HLS with custom segment duration', async () => {
      const ffmpegModule = await import('fluent-ffmpeg');
      const ffmpegFn = ffmpegModule.default;

      await transcoder.generateHLS('/videos/input.mp4', '/output/hls', 10);

      expect(ffmpegFn).toHaveBeenCalledWith('/videos/input.mp4');
    });

    it('should set correct HLS options', async () => {
      const ffmpegModule = await import('fluent-ffmpeg');
      const ffmpegFn = ffmpegModule.default as unknown as ReturnType<typeof vi.fn>;

      await transcoder.generateHLS('/videos/input.mp4', '/output/hls', 8);

      const mockCommand = ffmpegFn.mock.results[0]!.value as Record<
        string,
        ReturnType<typeof vi.fn>
      >;
      expect(mockCommand.addOptions).toHaveBeenCalledWith(
        expect.arrayContaining(['-hls_time', '8', '-f', 'hls']),
      );
    });
  });

  describe('extractThumbnail', () => {
    it('should extract a thumbnail at the given timestamp', async () => {
      const ffmpegModule = await import('fluent-ffmpeg');
      const ffmpegFn = ffmpegModule.default as unknown as ReturnType<typeof vi.fn>;

      const result = await transcoder.extractThumbnail(
        '/videos/input.mp4',
        '/output/thumb.jpg',
        30,
      );

      expect(result).toBe('/output/thumb.jpg');
      expect(ffmpegFn).toHaveBeenCalledWith('/videos/input.mp4');

      const mockCommand = ffmpegFn.mock.results[0]!.value as Record<
        string,
        ReturnType<typeof vi.fn>
      >;
      expect(mockCommand.seekInput).toHaveBeenCalledWith(30);
      expect(mockCommand.frames).toHaveBeenCalledWith(1);
      expect(mockCommand.output).toHaveBeenCalledWith('/output/thumb.jpg');
    });
  });

  describe('getMediaInfo', () => {
    it('should return ffprobe data', async () => {
      const result = await transcoder.getMediaInfo('/videos/input.mp4');
      expect(result).toEqual({ format: { duration: 120 }, streams: [] });
    });

    it('should reject on ffprobe error', async () => {
      const ffmpegModule = await import('fluent-ffmpeg');
      const ffmpegFn = ffmpegModule.default as unknown as { ffprobe: ReturnType<typeof vi.fn> };
      ffmpegFn.ffprobe.mockImplementationOnce(
        (_path: string, cb: (err: Error | null, data: unknown) => void) => {
          cb(new Error('File not found'), null);
        },
      );

      await expect(transcoder.getMediaInfo('/nonexistent.mp4')).rejects.toThrow('File not found');
    });
  });
});
