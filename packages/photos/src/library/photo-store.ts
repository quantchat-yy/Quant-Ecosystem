import type { Photo, Album } from '../types.js';

export class PhotoStore {
  private photos = new Map<string, Photo>();
  private albums = new Map<string, Album>();

  addPhoto(data: Omit<Photo, 'id' | 'albumIds'>): Photo {
    const photo: Photo = { ...data, id: crypto.randomUUID(), albumIds: [] };
    this.photos.set(photo.id, photo);
    return photo;
  }

  getPhoto(id: string): Photo | undefined {
    return this.photos.get(id);
  }
  removePhoto(id: string): boolean {
    const deleted = this.photos.delete(id);
    if (deleted) {
      for (const album of this.albums.values()) {
        album.photoIds = album.photoIds.filter((pid) => pid !== id);
      }
    }
    return deleted;
  }

  listAll(): Photo[] {
    return [...this.photos.values()];
  }

  listByDateRange(start: number, end: number): Photo[] {
    return [...this.photos.values()].filter((p) => p.timestamp >= start && p.timestamp <= end);
  }

  listByTag(tag: string): Photo[] {
    return [...this.photos.values()].filter((p) => p.tags.includes(tag));
  }

  getTimeline(): Map<string, Photo[]> {
    const timeline = new Map<string, Photo[]>();
    for (const photo of this.photos.values()) {
      const key = new Date(photo.timestamp).toISOString().slice(0, 10);
      const group = timeline.get(key) ?? [];
      group.push(photo);
      timeline.set(key, group);
    }
    return timeline;
  }

  createAlbum(name: string): Album {
    const album: Album = { id: crypto.randomUUID(), name, photoIds: [], createdAt: Date.now() };
    this.albums.set(album.id, album);
    return album;
  }

  addToAlbum(albumId: string, photoId: string): boolean {
    const album = this.albums.get(albumId);
    const photo = this.photos.get(photoId);
    if (!album || !photo) return false;
    if (!album.photoIds.includes(photoId)) album.photoIds.push(photoId);
    if (!photo.albumIds.includes(albumId)) photo.albumIds.push(albumId);
    return true;
  }

  removeFromAlbum(albumId: string, photoId: string): boolean {
    const album = this.albums.get(albumId);
    const photo = this.photos.get(photoId);
    if (!album || !photo) return false;
    album.photoIds = album.photoIds.filter((id) => id !== photoId);
    photo.albumIds = photo.albumIds.filter((id) => id !== albumId);
    return true;
  }

  getAlbums(): Album[] {
    return [...this.albums.values()];
  }

  getAlbumPhotos(albumId: string): Photo[] {
    const album = this.albums.get(albumId);
    if (!album) return [];
    return album.photoIds.map((id) => this.photos.get(id)).filter((p): p is Photo => !!p);
  }
}
