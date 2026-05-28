import type { Face, FaceCluster, Photo } from '../types.js';
import type { PhotoStore } from '../library/photo-store.js';

export interface FaceDetector {
  detect(imageUri: string): Promise<Face[]>;
}

export class NoOpFaceDetector implements FaceDetector {
  async detect(_imageUri: string): Promise<Face[]> {
    return [];
  }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0,
    magA = 0,
    magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const d = Math.sqrt(magA) * Math.sqrt(magB);
  return d === 0 ? 0 : dot / d;
}

export class FaceEngine {
  private clusters = new Map<string, FaceCluster>();
  constructor(private detector: FaceDetector) {}

  async detectFaces(photoUri: string): Promise<Face[]> {
    return this.detector.detect(photoUri);
  }

  clusterFaces(faces: Face[]): FaceCluster[] {
    const assigned = new Set<string>();
    const result: FaceCluster[] = [];
    for (const face of faces) {
      if (assigned.has(face.id)) continue;
      const cluster: FaceCluster = {
        id: crypto.randomUUID(),
        centroid: [...face.embedding],
        faceIds: [face.id],
      };
      assigned.add(face.id);
      for (const other of faces) {
        if (!assigned.has(other.id) && cosine(cluster.centroid, other.embedding) >= 0.7) {
          cluster.faceIds.push(other.id);
          assigned.add(other.id);
          // Recompute centroid as mean of all member embeddings
          const members = cluster.faceIds.map((id) => faces.find((f) => f.id === id)!.embedding);
          const dim = members[0]!.length;
          const mean: number[] = [];
          for (let i = 0; i < dim; i++) {
            let sum = 0;
            for (const emb of members) sum += emb[i]!;
            mean.push(sum / members.length);
          }
          cluster.centroid = mean;
        }
      }
      this.clusters.set(cluster.id, cluster);
      result.push(cluster);
    }
    return result;
  }

  nameCluster(clusterId: string, name: string): boolean {
    const c = this.clusters.get(clusterId);
    if (!c) return false;
    c.name = name;
    return true;
  }

  getClusters(): FaceCluster[] {
    return [...this.clusters.values()];
  }

  getPhotosForPerson(name: string, store: PhotoStore): Photo[] {
    const cluster = [...this.clusters.values()].find((c) => c.name === name);
    if (!cluster) return [];
    const ids = new Set(cluster.faceIds);
    const results: Photo[] = [];
    for (const photos of store.getTimeline().values()) {
      for (const p of photos) {
        if (p.faces.some((f) => ids.has(f.id))) results.push(p);
      }
    }
    return results;
  }
}
