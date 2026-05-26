// ============================================================================
// Media Package - Barrel Export
// ============================================================================

export { ImageProcessor } from './services/image-processor';
export {
  VideoTranscoder,
  TranscodeOptionsSchema,
  TranscodeProfileSchema,
} from './services/video-transcoder';
export type {
  TranscodeOptions,
  TranscodeInput,
  TranscodeResult,
} from './services/video-transcoder';
export { AudioProcessor } from './services/audio-processor';
export { UploadManager } from './services/upload-manager';
export { CDNService, CDNConfigSchema } from './services/cdn-service';
export type { CDNConfig, InvalidationResult } from './services/cdn-service';
export { MetadataExtractor } from './services/metadata-extractor';

export type {
  MediaType,
  ImageFormat,
  VideoCodec,
  AudioCodec,
  ContainerFormat,
  ProcessingOptions,
  TranscodeProfile,
  ImageFilter,
  ImageFilterConfig,
  UploadChunk,
  UploadSession,
  UploadStatus,
  MediaMetadata,
  GPSCoordinates,
  ExifData,
  CDNConfig as LegacyCDNConfig,
  CDNEdge,
  ThumbnailOptions,
  WaveformData,
  StreamingManifest,
  StreamVariant,
  StreamSegment,
  ProcessingJob,
  AudioEffect,
  AudioEffectConfig,
  ResponsiveImageSet,
} from './types';
