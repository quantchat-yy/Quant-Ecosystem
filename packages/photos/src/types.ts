export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Location {
  lat: number;
  lng: number;
  name?: string;
}
export interface PhotoMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  exif?: Record<string, unknown>;
}
export interface Face {
  id: string;
  boundingBox: BoundingBox;
  embedding: number[];
  clusterId?: string;
}
export interface FaceCluster {
  id: string;
  name?: string;
  centroid: number[];
  faceIds: string[];
}
export type ObjectCategory =
  | 'people'
  | 'animals'
  | 'food'
  | 'nature'
  | 'vehicles'
  | 'buildings'
  | 'text';
export interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: BoundingBox;
  category: ObjectCategory;
}
export interface Photo {
  id: string;
  uri: string;
  timestamp: number;
  metadata: PhotoMetadata;
  faces: Face[];
  objects: DetectedObject[];
  location?: Location;
  tags: string[];
  albumIds: string[];
}
export interface Album {
  id: string;
  name: string;
  photoIds: string[];
  createdAt: number;
}
export interface PhotoSearchQuery {
  text?: string;
  faceClusterId?: string;
  objectLabel?: string;
  location?: Location;
  timeRange?: { start: number; end: number };
}
export interface PhotoSearchResult {
  photo: Photo;
  score: number;
  matchReasons: string[];
}
export interface EditOperation {
  type: 'magicEraser' | 'unblur' | 'cinematic' | 'bestTake';
  inputUri: string;
  params: Record<string, unknown>;
}
export interface EditResult {
  success: boolean;
  outputUri?: string;
  error?: string;
}
