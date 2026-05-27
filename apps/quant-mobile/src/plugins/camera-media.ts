// Camera & Media Service - Photo capture and gallery access

export interface Photo {
  path: string;
  webPath: string;
  format: 'jpeg' | 'png' | 'heic';
  width: number;
  height: number;
  size: number;
  exifData?: Record<string, unknown>;
}

export interface MediaItem {
  id: string;
  path: string;
  type: 'photo' | 'video';
  createdAt: number;
  duration?: number;
  thumbnail?: string;
}

export interface CameraOptions {
  quality?: number;
  width?: number;
  height?: number;
  direction?: 'front' | 'rear';
  format?: 'jpeg' | 'png';
  saveToGallery?: boolean;
}

export interface GalleryOptions {
  limit?: number;
  mediaType?: 'photo' | 'video' | 'all';
}

export class CameraMediaService {
  private permissionGranted = false;

  async takePhoto(options?: CameraOptions): Promise<Photo> {
    this.ensurePermission();
    return {
      path: `/tmp/photo_${Date.now()}.${options?.format ?? 'jpeg'}`,
      webPath: `file:///tmp/photo_${Date.now()}.${options?.format ?? 'jpeg'}`,
      format: options?.format ?? 'jpeg',
      width: options?.width ?? 4032,
      height: options?.height ?? 3024,
      size: 2_500_000,
    };
  }

  async pickFromGallery(_options?: GalleryOptions): Promise<MediaItem[]> {
    this.ensurePermission();
    return [];
  }

  async getMediaLibrary(_limit?: number): Promise<MediaItem[]> {
    this.ensurePermission();
    return [];
  }

  async requestPermission(): Promise<boolean> {
    this.permissionGranted = true;
    return true;
  }

  isPermissionGranted(): boolean {
    return this.permissionGranted;
  }

  private ensurePermission(): void {
    if (!this.permissionGranted) {
      throw new Error('Camera/media permission not granted');
    }
  }
}
