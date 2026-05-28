// ============================================================================
// QuantNeon - Shopping Page
// ============================================================================

import type { Product } from '../types';

interface ShopPageProps {
  products: Product[];
  categories: string[];
  featured: Product[];
}

export function ShopPage({ products, categories, featured }: ShopPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20" aria-label="Shop">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <h1 className="text-gray-900 text-xl font-bold">Shop</h1>
        <button
          type="button"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          aria-label="View cart"
        >
          🛒
        </button>
      </header>

      {/* Category Chips */}
      <div
        className="flex gap-2 px-4 py-3 overflow-x-auto"
        role="list"
        aria-label="Product categories"
      >
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className="flex-shrink-0 min-h-[44px] px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            role="listitem"
          >
            {c}
          </button>
        ))}
      </div>

      {/* Featured Products */}
      <section className="px-4 mt-4" aria-label="Featured products">
        <h2 className="text-gray-900 font-bold text-lg mb-3">Featured</h2>
        <div className="grid grid-cols-2 gap-3">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* All Products */}
      <section className="px-4 mt-8" aria-label="All products">
        <h2 className="text-gray-900 font-bold text-lg mb-3">All Products</h2>
        <div className="grid grid-cols-2 gap-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm" data-id={product.id}>
      <img
        src={product.images[0] || ''}
        alt={product.name}
        className="w-full h-40 object-cover"
        loading="lazy"
      />
      <div className="p-3">
        <h3 className="text-gray-900 font-semibold text-sm truncate">{product.name}</h3>
        <span className="text-gray-900 font-bold text-base block mt-1">
          ${product.price.toFixed(2)}
        </span>
        <span className="text-gray-500 text-xs">★ {product.rating}/5</span>
      </div>
    </div>
  );
}

export default ShopPage;
