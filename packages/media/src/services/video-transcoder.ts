// ============================================================================
// Media - Video Transcoder
// Real fluent-ffmpeg based HLS transcoding implementation
// ============================================================================

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/** Schema for transcode profile configuration */
export const TranscodeProfileSchema = z.object({
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  videoBitrate: z.string(),
  audioBitrate: z.string(),
});

/** Schema for transcoding options */
export const TranscodeOptionsSchema = z.object({
  inputPath: z.string().min(1),
  outputDir: z.string().min(1),
  profiles: z.array(TranscodeProfileSchema).optional(),
  segmentDuration: z.number().int().positive().default(6),
});

export type TranscodeOptions = z.infer<typeof TranscodeOptionsSchema>;

/** Input type for transcode method (segmentDuration is optional) */
export type TranscodeInput = z.input<typeof TranscodeOptionsSchema>;

/** Result of a transcoding operation */
export interface TranscodeResult {
  masterPlaylistPath: string;
  variants: Array<{ name: string; playlistPath: string; resolution: string }>;
  duration: number;
}

/** Default HLS transcode profiles */
const DEFAULT_PROFILES: Array<z.infer<typeof TranscodeProfileSchema>> = [
  { name: '360p', width: 640, height: 360, videoBitrate: '800k', audioBitrate: '96k' },
  { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k' },
  { name: '1080p', width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k' },
];

/**
 * VideoTranscoder - Real fluent-ffmpeg based video transcoding
 *
 * Provides HLS adaptive bitrate transcoding, thumbnail extraction,
 * and media info retrieval using ffmpeg.
 */
export class VideoTranscoder {
  /**
   * Transcode a video to multiple HLS variants
   * @param options - Validated transcoding options
   * @returns Transcode result with paths to generated playlists
   */
  async transcode(options: TranscodeInput): Promise<TranscodeResult> {
    const validated = TranscodeOptionsSchema.parse(options);
    const profiles = validated.profiles ?? DEFAULT_PROFILES;
    const { inputPath, outputDir, segmentDuration } = validated;

    await mkdir(outputDir, { recursive: true });

    const variants: TranscodeResult['variants'] = [];

    for (const profile of profiles) {
      const variantDir = join(outputDir, profile.name);
      await mkdir(variantDir, { recursive: true });

      const playlistPath = join(variantDir, 'playlist.m3u8');
      const segmentPattern = join(variantDir, 'segment_%03d.ts');

      await this.runFfmpeg(inputPath, playlistPath, segmentPattern, profile, segmentDuration);

      variants.push({
        name: profile.name,
        playlistPath,
        resolution: `${profile.width}x${profile.height}`,
      });
    }

    // Generate master playlist
    const masterPlaylistPath = join(outputDir, 'master.m3u8');
    await this.writeMasterPlaylist(masterPlaylistPath, variants, profiles);

    // Get duration
    const info = await this.getMediaInfo(inputPath);
    const duration = info.format?.duration ?? 0;

    return { masterPlaylistPath, variants, duration };
  }

  /**
   * Generate HLS output from a single input
   * @param inputPath - Path to the input video file
   * @param outputDir - Directory to write HLS segments
   * @param segmentDuration - Duration of each segment in seconds
   * @returns Path to the generated playlist
   */
  async generateHLS(
    inputPath: string,
    outputDir: string,
    segmentDuration: number = 6,
  ): Promise<string> {
    await mkdir(outputDir, { recursive: true });

    const playlistPath = join(outputDir, 'playlist.m3u8');
    const segmentPattern = join(outputDir, 'segment_%03d.ts');

    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .addOptions([
          '-profile:v',
          'baseline',
          '-level',
          '3.0',
          '-start_number',
          '0',
          '-hls_time',
          String(segmentDuration),
          '-hls_list_size',
          '0',
          '-hls_segment_filename',
          segmentPattern,
          '-f',
          'hls',
        ])
        .output(playlistPath)
        .on('end', () => resolve(playlistPath))
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  /**
   * Extract a thumbnail from a video at a specific timestamp
   * @param inputPath - Path to the input video
   * @param outputPath - Path to write the thumbnail image
   * @param timestamp - Time in seconds to extract the frame
   * @returns Path to the generated thumbnail
   */
  async extractThumbnail(
    inputPath: string,
    outputPath: string,
    timestamp: number,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      ffmpeg(inputPath)
        .seekInput(timestamp)
        .frames(1)
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  /**
   * Get media file information using ffprobe
   * @param inputPath - Path to the media file
   * @returns ffprobe data containing format and stream information
   */
  async getMediaInfo(inputPath: string): Promise<ffmpeg.FfprobeData> {
    return new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }

  // ---- Private Methods ----

  private runFfmpeg(
    inputPath: string,
    playlistPath: string,
    segmentPattern: string,
    profile: z.infer<typeof TranscodeProfileSchema>,
    segmentDuration: number,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .size(`${profile.width}x${profile.height}`)
        .videoBitrate(profile.videoBitrate)
        .audioBitrate(profile.audioBitrate)
        .addOptions([
          '-profile:v',
          'baseline',
          '-level',
          '3.0',
          '-start_number',
          '0',
          '-hls_time',
          String(segmentDuration),
          '-hls_list_size',
          '0',
          '-hls_segment_filename',
          segmentPattern,
          '-f',
          'hls',
        ])
        .output(playlistPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  private async writeMasterPlaylist(
    masterPath: string,
    variants: TranscodeResult['variants'],
    profiles: Array<z.infer<typeof TranscodeProfileSchema>>,
  ): Promise<void> {
    const { writeFile } = await import('node:fs/promises');
    const { relative, dirname } = await import('node:path');

    let content = '#EXTM3U\n#EXT-X-VERSION:3\n';

    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i]!;
      const profile = profiles[i]!;
      const bandwidth = parseInt(profile.videoBitrate) * 1000;
      const relativePath = relative(dirname(masterPath), variant.playlistPath);
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${variant.resolution}\n`;
      content += `${relativePath}\n`;
    }

    await writeFile(masterPath, content, 'utf-8');
  }
}
