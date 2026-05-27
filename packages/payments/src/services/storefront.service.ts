// ============================================================================
// Payments - Storefront Service
// Course/product storefront for creators with 85/15 split
// ============================================================================

import { z } from 'zod';
import type { StorefrontProduct, ProductPurchase, ProductType, CurrencyCode } from '../types';

const CREATOR_SHARE = 0.85;

export const CreateProductSchema = z.object({
  creatorId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['digital_good', 'course', 'template', 'preset', 'ebook']),
  price: z.number().positive(),
  currency: z.string().optional(),
  downloadUrl: z.string().optional(),
  thumbnailUrl: z.string().optional(),
});

export const PurchaseProductSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
});

/**
 * StorefrontService - Course/product storefront for creators
 *
 * Creators can list digital goods, courses, templates, presets, and ebooks.
 * Purchases use an 85/15 creator/platform split.
 */
export class StorefrontService {
  private readonly products: Map<string, StorefrontProduct> = new Map();
  private readonly purchases: ProductPurchase[] = [];

  /**
   * Create a new product listing
   */
  createProduct(params: {
    creatorId: string;
    name: string;
    description: string;
    type: ProductType;
    price: number;
    currency?: CurrencyCode;
    downloadUrl?: string;
    thumbnailUrl?: string;
  }): StorefrontProduct {
    const validated = CreateProductSchema.parse(params);

    const product: StorefrontProduct = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creatorId: validated.creatorId,
      name: validated.name,
      description: validated.description,
      type: validated.type as ProductType,
      price: validated.price,
      currency: (validated.currency as CurrencyCode) || 'USD',
      downloadUrl: validated.downloadUrl,
      thumbnailUrl: validated.thumbnailUrl,
      salesCount: 0,
      revenue: 0,
      active: true,
      createdAt: Date.now(),
    };

    this.products.set(product.id, product);
    return product;
  }

  /**
   * List all active products for a creator
   */
  listProducts(creatorId: string): StorefrontProduct[] {
    const results: StorefrontProduct[] = [];
    for (const [, product] of this.products) {
      if (product.creatorId === creatorId && product.active) {
        results.push(product);
      }
    }
    return results.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Purchase a product
   */
  purchaseProduct(params: { userId: string; productId: string }): ProductPurchase {
    const validated = PurchaseProductSchema.parse(params);

    const product = this.products.get(validated.productId);
    if (!product) {
      throw new Error(`Product not found: ${validated.productId}`);
    }

    if (!product.active) {
      throw new Error('Product is no longer available');
    }

    const creatorShare = Math.round(product.price * CREATOR_SHARE * 100) / 100;
    const platformShare = Math.round((product.price - creatorShare) * 100) / 100;

    const purchase: ProductPurchase = {
      id: `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: validated.userId,
      productId: validated.productId,
      creatorId: product.creatorId,
      amount: product.price,
      creatorShare,
      platformShare,
      purchasedAt: Date.now(),
    };

    // Update product stats
    product.salesCount += 1;
    product.revenue += creatorShare;

    this.purchases.push(purchase);
    return purchase;
  }

  /**
   * Get order history for a user
   */
  getOrderHistory(userId: string): ProductPurchase[] {
    return this.purchases
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.purchasedAt - a.purchasedAt);
  }

  /**
   * Get sales summary for a creator
   */
  getCreatorSales(creatorId: string): {
    totalSales: number;
    totalRevenue: number;
    products: StorefrontProduct[];
  } {
    const products = this.listProducts(creatorId);
    const totalSales = products.reduce((sum, p) => sum + p.salesCount, 0);
    const totalRevenue = products.reduce((sum, p) => sum + p.revenue, 0);

    return { totalSales, totalRevenue, products };
  }
}
