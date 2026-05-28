import { describe, it, expect } from 'vitest';
import { PhotoStore } from '../library/photo-store.js';

const base = {
  uri: 'file://p.jpg',
  timestamp: new Date('2024-06-15T10:00:00Z').getTime(),
  metadata: { width: 1920, height: 1080, format: 'jpeg', size: 2048 },
  faces: [],
  objects: [],
  tags: ['sunset'],
};

describe('PhotoStore', () => {
  it('addPhoto and getPhoto', () => {
    const s = new PhotoStore();
    const p = s.addPhoto(base);
    expect(p.id).toBeDefined();
    expect(s.getPhoto(p.id)).toEqual(p);
  });

  it('removePhoto', () => {
    const s = new PhotoStore();
    const p = s.addPhoto(base);
    expect(s.removePhoto(p.id)).toBe(true);
    expect(s.getPhoto(p.id)).toBeUndefined();
  });

  it('listByDateRange', () => {
    const s = new PhotoStore();
    s.addPhoto(base);
    s.addPhoto({ ...base, timestamp: new Date('2024-01-01').getTime() });
    expect(
      s.listByDateRange(new Date('2024-06-01').getTime(), new Date('2024-06-30').getTime()),
    ).toHaveLength(1);
  });

  it('getTimeline groups by day', () => {
    const s = new PhotoStore();
    s.addPhoto(base);
    s.addPhoto({ ...base, timestamp: new Date('2024-06-15T14:00:00Z').getTime() });
    s.addPhoto({ ...base, timestamp: new Date('2024-06-16T09:00:00Z').getTime() });
    const t = s.getTimeline();
    expect(t.get('2024-06-15')).toHaveLength(2);
    expect(t.get('2024-06-16')).toHaveLength(1);
  });

  it('album CRUD', () => {
    const s = new PhotoStore();
    const p = s.addPhoto(base);
    const a = s.createAlbum('Vacation');
    expect(s.addToAlbum(a.id, p.id)).toBe(true);
    expect(s.getAlbumPhotos(a.id)).toHaveLength(1);
    s.removeFromAlbum(a.id, p.id);
    expect(s.getAlbumPhotos(a.id)).toHaveLength(0);
  });
});
