// ============================================================================
// Media - Video Transcoder
// Multi-resolution transcoding with HLS/DASH manifest generation
// ============================================================================

import type {
  TranscodeProfile,
  VideoCodec,
  AudioCodec,
  ContainerFormat,
  StreamingManifest,
  StreamVariant,
  StreamSegment,
  ProcessingJob,
} from '../types';

/** Video source information */
interface VideoSource {
  id: string;
  fileName: string;
  duration: number; // seconds
  width: number;
  height: number;
  videoCodec: VideoCodec;
  audioCodec: AudioCodec;
  videoBitrate: number;
  audioBitrate: number;
  framerate: number;
  container: ContainerFormat;
  size: number;
}

/** Predefined transcode profiles */
const PRESET_PROFILES: Record<string, TranscodeProfile> = {
  '360p': { id: '360p', name: '360p', videoCodec: 'h264', audioCodec: 'aac', container: 'mp4', videoBitrate: 800, audioBitrate: 96, width: 640, height: 360, framerate: 30, preset: 'medium', crf: 28 },
  '480p': { id: '480p', name: '480p', videoCodec: 'h264', audioCodec: 'aac', container: 'mp4', videoBitrate: 1500, audioBitrate: 128, width: 854, height: 480, framerate: 30, preset: 'medium', crf: 26 },
  '720p': { id: '720p', name: '720p', videoCodec: 'h264', audioCodec: 'aac', container: 'mp4', videoBitrate: 3000, audioBitrate: 128, width: 1280, height: 720, framerate: 30, preset: 'medium', crf: 23 },
  '1080p': { id: '1080p', name: '1080p', videoCodec: 'h264', audioCodec: 'aac', container: 'mp4', videoBitrate: 5000, audioBitrate: 192, width: 1920, height: 1080, framerate: 30, preset: 'medium', crf: 22 },
  '4k': { id: '4k', name: '4K', videoCodec: 'h265', audioCodec: 'aac', container: 'mp4', videoBitrate: 15000, audioBitrate: 256, width: 3840, height: 2160, framerate: 30, preset: 'slow', crf: 20 },
};

/**
 * VideoTranscoder - Multi-resolution video transcoding
 *
 * Provides video transcoding to multiple resolutions and formats,
 * HLS/DASH streaming manifest generation, frame extraction,
 * and segment splitting for adaptive bitrate streaming.
 */
export class VideoTranscoder {
  private sources: Map<string, VideoSource>;
  private jobs: Map<string, ProcessingJob>;
  private outputs: Map<string, { sourceId: string; profile: TranscodeProfile; outputSize: number }>;
  private manifests: Map<string, StreamingManifest>;
  private jobCounter: number = 0;

  constructor() {
    this.sources = new Map();
    this.jobs = new Map();
    this.outputs = new Map();
    this.manifests = new Map();
  }

  /**
   * Register a video source for transcoding
   */
  public registerSource(
    id: string,
    fileName: string,
    options: {
      duration: number;
      width: number;
      height: number;
      videoCodec?: VideoCodec;
      audioCodec?: AudioCodec;
      videoBitrate?: number;
      audioBitrate?: number;
      framerate?: number;
      container?: ContainerFormat;
      size?: number;
    }
  ): VideoSource {
    const source: VideoSource = {
      id,
      fileName,
      duration: options.duration,
      width: options.width,
      height: options.height,
      videoCodec: options.videoCodec || 'h264',
      audioCodec: options.audioCodec || 'aac',
      videoBitrate: options.videoBitrate || 5000,
      audioBitrate: options.audioBitrate || 128,
      framerate: options.framerate || 30,
      container: options.container || 'mp4',
      size: options.size || (options.duration * (options.videoBitrate || 5000) * 125), // bitrate to bytes
    };

    this.sources.set(id, source);
    return source;
  }

  /**
   * Transcode a video to a specific profile
   */
  public async transcode(sourceId: string, profile: TranscodeProfile): Promise<ProcessingJob> {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    const jobId = this.generateId('job');
    const job: ProcessingJob = {
      id: jobId,
      type: 'transcode',
      status: 'processing',
      progress: 0,
      inputFile: source.fileName,
      outputFile: this.generateOutputFileName(source.fileName, profile),
      startedAt: Date.now(),
      profile,
    };

    this.jobs.set(jobId, job);

    // Simulate transcoding progress
    const outputSize = this.estimateOutputSize(source, profile);

    // Complete the job
    job.status = 'completed';
    job.progress = 100;
    job.completedAt = Date.now();

    this.outputs.set(jobId, { sourceId, profile, outputSize });

    return job;
  }

  /**
   * Transcode to multiple resolutions simultaneously
   */
  public async transcodeMultiple(sourceId: string, profileNames?: string[]): Promise<ProcessingJob[]> {
    const profiles = profileNames
      ? profileNames.map(name => PRESET_PROFILES[name]).filter(Boolean)
      : this.getApplicableProfiles(sourceId);

    const jobs: ProcessingJob[] = [];
    for (const profile of profiles) {
      const job = await this.transcode(sourceId, profile);
      jobs.push(job);
    }

    return jobs;
  }

  /**
   * Generate an HLS (HTTP Live Streaming) manifest
   */
  public generateHLS(sourceId: string, options: { segmentDuration?: number; profiles?: string[] } = {}): StreamingManifest {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    const segmentDuration = options.segmentDuration || 6; // 6 second segments
    const profiles = options.profiles
      ? options.profiles.map(p => PRESET_PROFILES[p]).filter(Boolean)
      : this.getApplicableProfiles(sourceId);

    const variants: StreamVariant[] = profiles.map(profile => {
      const numSegments = Math.ceil(source.duration / segmentDuration);
      const segments: StreamSegment[] = [];

      for (let i = 0; i < numSegments; i++) {
        const duration = Math.min(segmentDuration, source.duration - i * segmentDuration);
        segments.push({
          index: i,
          url: `/hls/${sourceId}/${profile.id}/segment_${i}.ts`,
          duration,
        });
      }

      return {
        resolution: `${profile.width}x${profile.height}`,
        width: profile.width || source.width,
        height: profile.height || source.height,
        bitrate: profile.videoBitrate || 3000,
        codec: `${profile.videoCodec || 'h264'},${profile.audioCodec || 'aac'}`,
        playlistUrl: `/hls/${sourceId}/${profile.id}/playlist.m3u8`,
        segments,
      };
    });

    const manifest: StreamingManifest = {
      type: 'hls',
      masterPlaylistUrl: `/hls/${sourceId}/master.m3u8`,
      variants,
      duration: source.duration,
      segmentDuration,
    };

    this.manifests.set(`hls_${sourceId}`, manifest);
    return manifest;
  }

  /**
   * Generate a DASH (Dynamic Adaptive Streaming over HTTP) manifest
   */
  public generateDASH(sourceId: string, options: { segmentDuration?: number; profiles?: string[] } = {}): StreamingManifest {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    const segmentDuration = options.segmentDuration || 4;
    const profiles = options.profiles
      ? options.profiles.map(p => PRESET_PROFILES[p]).filter(Boolean)
      : this.getApplicableProfiles(sourceId);

    const variants: StreamVariant[] = profiles.map(profile => {
      const numSegments = Math.ceil(source.duration / segmentDuration);
      const segments: StreamSegment[] = [];
      const segmentSize = ((profile.videoBitrate || 3000) * 1000 / 8) * segmentDuration;

      for (let i = 0; i < numSegments; i++) {
        const duration = Math.min(segmentDuration, source.duration - i * segmentDuration);
        segments.push({
          index: i,
          url: `/dash/${sourceId}/${profile.id}/chunk_${i}.m4s`,
          duration,
          byteRange: { start: i * segmentSize, end: (i + 1) * segmentSize },
        });
      }

      return {
        resolution: `${profile.width}x${profile.height}`,
        width: profile.width || source.width,
        height: profile.height || source.height,
        bitrate: profile.videoBitrate || 3000,
        codec: `${profile.videoCodec || 'h264'},${profile.audioCodec || 'aac'}`,
        playlistUrl: `/dash/${sourceId}/${profile.id}/manifest.mpd`,
        segments,
      };
    });

    const manifest: StreamingManifest = {
      type: 'dash',
      masterPlaylistUrl: `/dash/${sourceId}/manifest.mpd`,
      variants,
      duration: source.duration,
      segmentDuration,
    };

    this.manifests.set(`dash_${sourceId}`, manifest);
    return manifest;
  }

  /**
   * Extract frames from a video at specified timestamps
   */
  public extractFrames(sourceId: string, timestamps: number[]): Array<{ timestamp: number; width: number; height: number; format: string; size: number }> {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    const frames: Array<{ timestamp: number; width: number; height: number; format: string; size: number }> = [];

    for (const ts of timestamps) {
      if (ts < 0 || ts > source.duration) {
        throw new Error(`Timestamp ${ts} is out of range (0-${source.duration})`);
      }

      // Estimate frame size (uncompressed frame as JPEG)
      const frameSize = Math.round(source.width * source.height * 3 * 0.15); // ~15% compression

      frames.push({
        timestamp: ts,
        width: source.width,
        height: source.height,
        format: 'jpeg',
        size: frameSize,
      });
    }

    return frames;
  }

  /**
   * Get available resolutions for a source video
   */
  public getResolutions(sourceId: string): Array<{ name: string; width: number; height: number; estimatedSize: number }> {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    const resolutions: Array<{ name: string; width: number; height: number; estimatedSize: number }> = [];

    for (const [name, profile] of Object.entries(PRESET_PROFILES)) {
      if (profile.width! <= source.width && profile.height! <= source.height) {
        resolutions.push({
          name,
          width: profile.width!,
          height: profile.height!,
          estimatedSize: this.estimateOutputSize(source, profile),
        });
      }
    }

    return resolutions.sort((a, b) => a.width - b.width);
  }

  /**
   * Estimate transcoded file duration (accounts for processing overhead)
   */
  public estimateDuration(sourceId: string, profile: TranscodeProfile): { transcodingTimeMs: number; outputDuration: number } {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    // Transcoding speed depends on preset and resolution
    const presetSpeeds: Record<string, number> = {
      ultrafast: 10, fast: 5, medium: 2.5, slow: 1, veryslow: 0.5,
    };

    const speedFactor = presetSpeeds[profile.preset || 'medium'] || 2.5;
    const resolutionFactor = ((profile.width || 1920) * (profile.height || 1080)) / (1920 * 1080);
    const transcodingTimeMs = (source.duration / speedFactor) * resolutionFactor * 1000;

    return {
      transcodingTimeMs: Math.round(transcodingTimeMs),
      outputDuration: source.duration,
    };
  }

  /**
   * Split video into segments for streaming
   */
  public splitSegments(sourceId: string, segmentDurationSec: number = 6): StreamSegment[] {
    const source = this.sources.get(sourceId);
    if (!source) throw new Error(`Source not found: ${sourceId}`);

    const numSegments = Math.ceil(source.duration / segmentDurationSec);
    const segments: StreamSegment[] = [];
    const bytesPerSecond = source.size / source.duration;

    for (let i = 0; i < numSegments; i++) {
      const duration = Math.min(segmentDurationSec, source.duration - i * segmentDurationSec);
      const start = Math.round(i * segmentDurationSec * bytesPerSecond);
      const end = Math.round(start + duration * bytesPerSecond);

      segments.push({
        index: i,
        url: `/segments/${sourceId}/seg_${i}.ts`,
        duration,
        byteRange: { start, end },
      });
    }

    return segments;
  }

  /**
   * Get all transcoding jobs
   */
  public getJobs(): ProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get preset profiles
   */
  public getPresets(): TranscodeProfile[] {
    return Object.values(PRESET_PROFILES);
  }

  /**
   * Get a source by ID
   */
  public getSource(sourceId: string): VideoSource | undefined {
    return this.sources.get(sourceId);
  }

  // ---- Private Methods ----

  private getApplicableProfiles(sourceId: string): TranscodeProfile[] {
    const source = this.sources.get(sourceId);
    if (!source) return [];

    return Object.values(PRESET_PROFILES).filter(
      p => (p.width || 0) <= source.width && (p.height || 0) <= source.height
    );
  }

  private estimateOutputSize(source: VideoSource, profile: TranscodeProfile): number {
    const videoBitrate = profile.videoBitrate || source.videoBitrate;
    const audioBitrate = profile.audioBitrate || source.audioBitrate;
    const totalBitrate = videoBitrate + audioBitrate; // kbps
    return Math.round((totalBitrate * 1000 / 8) * source.duration); // bytes
  }

  private generateOutputFileName(input: string, profile: TranscodeProfile): string {
    const baseName = input.replace(/\.[^.]+$/, '');
    return `${baseName}_${profile.id}.${profile.container}`;
  }

  private generateId(prefix: string): string {
    this.jobCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.jobCounter.toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${counter}_${random}`;
  }
}
