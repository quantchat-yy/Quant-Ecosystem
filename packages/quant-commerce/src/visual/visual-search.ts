import { ShoppingItem, ComparisonResult } from '../types.js';

export interface VisualSearchProvider {
  identifyItem(imageData: string): Promise<{ name: string; category: string; confidence: number }>;
  findSimilar(imageData: string): Promise<ShoppingItem[]>;
}

export class VisualSearchEngine implements VisualSearchProvider {
  private providers: VisualSearchProvider[] = [];

  addProvider(provider: VisualSearchProvider): void {
    this.providers.push(provider);
  }

  async identifyItem(
    imageData: string,
  ): Promise<{ name: string; category: string; confidence: number }> {
    for (const p of this.providers) {
      const r = await p.identifyItem(imageData);
      if (r.confidence > 0) return r;
    }
    return { name: 'unknown', category: 'unknown', confidence: 0 };
  }

  async findSimilar(imageData: string): Promise<ShoppingItem[]> {
    const all: ShoppingItem[] = [];
    for (const p of this.providers) all.push(...(await p.findSimilar(imageData)));
    return all;
  }

  async findOnline(item: { name: string; category: string }): Promise<ShoppingItem[]> {
    const all: ShoppingItem[] = [];
    for (const p of this.providers) all.push(...(await p.findSimilar(item.name)));
    return all;
  }

  compareVisualResults(query: string, results: ShoppingItem[]): ComparisonResult {
    const sorted = [...results].sort((a, b) => a.price - b.price);
    const bestPrice = sorted[0] ?? null;
    const bestRating =
      results.length > 0 ? results.reduce((best, i) => (i.rating > best.rating ? i : best)) : null;
    return { query, results: sorted, bestPrice, bestRating, searchedAt: Date.now() };
  }
}
