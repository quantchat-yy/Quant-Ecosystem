import { ShoppingItem, MerchantSearch, ComparisonResult } from '../types.js';

export interface MerchantProvider {
  search(query: MerchantSearch): Promise<ShoppingItem[]>;
  getProductDetails(id: string): Promise<ShoppingItem | null>;
  checkStock(id: string): Promise<boolean>;
}

export class MerchantAggregator {
  private providers: MerchantProvider[] = [];

  addProvider(provider: MerchantProvider): void {
    this.providers.push(provider);
  }

  async search(query: MerchantSearch): Promise<ComparisonResult> {
    const all: ShoppingItem[] = [];
    for (const p of this.providers) all.push(...(await p.search(query)));
    const filtered = all.filter((i) => {
      if (query.minPrice !== undefined && i.price < query.minPrice) return false;
      if (query.maxPrice !== undefined && i.price > query.maxPrice) return false;
      return true;
    });
    const ranked = [...filtered].sort((a, b) => a.price - b.price);
    const bestPrice = ranked[0] ?? null;
    const bestRating =
      filtered.length > 0
        ? filtered.reduce((best, i) => (i.rating > best.rating ? i : best))
        : null;
    return { query: query.query, results: ranked, bestPrice, bestRating, searchedAt: Date.now() };
  }

  getBestDeal(results: ComparisonResult): ShoppingItem | null {
    return results.bestPrice;
  }
}

export class MockMerchantProvider implements MerchantProvider {
  private items: ShoppingItem[] = [];
  setItems(items: ShoppingItem[]): void {
    this.items = items;
  }
  async search(_q: MerchantSearch): Promise<ShoppingItem[]> {
    return this.items;
  }
  async getProductDetails(id: string): Promise<ShoppingItem | null> {
    return this.items.find((i) => i.id === id) ?? null;
  }
  async checkStock(_id: string): Promise<boolean> {
    return true;
  }
}
