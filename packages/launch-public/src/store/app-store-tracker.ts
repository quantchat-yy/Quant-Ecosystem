import type { AppStore, SubmissionStatus } from '../types.js';

export class AppStoreTracker {
  private statuses: Map<AppStore, SubmissionStatus> = new Map();
  private ratings: Map<AppStore, number[]> = new Map();

  submitApp(store: AppStore) {
    this.statuses.set(store, 'submitted');
  }
  updateStatus(store: AppStore, status: SubmissionStatus) {
    this.statuses.set(store, status);
  }
  getStatus(store: AppStore): SubmissionStatus | undefined {
    return this.statuses.get(store);
  }

  addRating(store: AppStore, stars: number) {
    const list = this.ratings.get(store) ?? [];
    list.push(stars);
    this.ratings.set(store, list);
  }

  getAverageRating(store: AppStore): number {
    const list = this.ratings.get(store);
    if (!list || list.length === 0) return 0;
    return list.reduce((a, b) => a + b, 0) / list.length;
  }

  meetsRatingTarget(store: AppStore): boolean {
    return this.getAverageRating(store) >= 4.5;
  }
  getReviewCount(store: AppStore): number {
    return this.ratings.get(store)?.length ?? 0;
  }
}
