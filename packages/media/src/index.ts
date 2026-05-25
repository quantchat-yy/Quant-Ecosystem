// ============================================================================
// Media Package - Barrel Export
// ============================================================================

export { ImageProcessor } from './services/image-processor';
export { VideoTranscoder } from './services/video-transcoder';
export { AudioProcessor } from './services/audio-processor';
export { UploadManager } from './services/upload-manager';
export { CDNService } from './services/cdn-service';
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
  CDNConfig,
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
