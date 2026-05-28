import type { PhotoSearchQuery, PhotoSearchResult } from '../types.js';
import type { PhotoStore } from '../library/photo-store.js';
import type { FaceEngine } from '../ai/face-engine.js';

const HINDI_MAP: Record<string, string> = {
  samudra: 'beach',
  parivaar: 'person',
  khana: 'food',
  ghar: 'house',
  yatra: 'travel',
};

export class PhotoSearch {
  search(query: PhotoSearchQuery, store: PhotoStore, faceEngine: FaceEngine): PhotoSearchResult[] {
    const results: PhotoSearchResult[] = [];
    for (const photo of store.listAll()) {
      let score = 0;
      const reasons: string[] = [];
      if (query.faceClusterId) {
        const cluster = faceEngine.getClusters().find((c) => c.id === query.faceClusterId);
        if (cluster && photo.faces.some((f) => cluster.faceIds.includes(f.id))) {
          score += 4;
          reasons.push('face');
        }
      }
      if (query.objectLabel && photo.objects.some((o) => o.label === query.objectLabel)) {
        score += 3;
        reasons.push('object');
      }
      if (query.location && photo.location) {
        const dist =
          Math.abs(photo.location.lat - query.location.lat) +
          Math.abs(photo.location.lng - query.location.lng);
        if (dist < 1) {
          score += 2;
          reasons.push('location');
        }
      }
      if (
        query.timeRange &&
        photo.timestamp >= query.timeRange.start &&
        photo.timestamp <= query.timeRange.end
      ) {
        score += 1;
        reasons.push('time');
      }
      if (score > 0) results.push({ photo, score, matchReasons: reasons });
    }
    return results.sort((a, b) => b.score - a.score);
  }

  parseNaturalQuery(text: string): PhotoSearchQuery {
    const words = text
      .toLowerCase()
      .split(/\s+/)
      .map((w) => HINDI_MAP[w] ?? w);
    const label = words.find((w) => ['beach', 'food', 'house', 'travel', 'person'].includes(w));
    return { text, ...(label ? { objectLabel: label } : {}) };
  }
}
