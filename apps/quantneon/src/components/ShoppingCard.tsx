// ============================================================================
// QuantNeon - ShoppingCard Component (product card with purchase)
// ============================================================================

import type { Product } from '../types';

interface ShoppingCardProps {
  product: Product;
  onAddToCart: (productId: string) => void;
  onWishlist: (productId: string) => void;
}

export function ShoppingCard({ product, onAddToCart, onWishlist }: ShoppingCardProps) {
  return (
    <div
      className="bg-white rounded-xl overflow-hidden shadow-md"
      data-id={product.id}
      aria-label={`Product: ${product.name}`}
    >
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100">
        <img
          src={product.images[0] || ''}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {!product.inStock && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-full">
            Out of Stock
          </span>
        )}
        <button
          className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
          onClick={() => onWishlist(product.id)}
          aria-label={`Add ${product.name} to wishlist`}
        >
          ♡
        </button>
      </div>

      {/* Product Info */}
      <div className="p-3">
        <h3 className="text-gray-900 font-semibold text-sm truncate">{product.name}</h3>
        <p className="text-gray-900 font-bold text-base mt-1">
          {product.currency} {product.price.toFixed(2)}
        </p>
        <div
          className="flex items-center gap-1 mt-1"
          aria-label={`Rating: ${product.rating} out of 5, ${product.reviewCount} reviews`}
        >
          <span className="text-yellow-500 text-xs">★</span>
          <span className="text-gray-600 text-xs">
            {product.rating}/5 ({product.reviewCount})
          </span>
        </div>
        {product.inStock && (
          <button
            className="w-full min-h-[44px] mt-3 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors"
            onClick={() => onAddToCart(product.id)}
            aria-label={`Add ${product.name} to cart`}
          >
            Add to Cart
          </button>
        )}
      </div>
    </div>
  );
}

export default ShoppingCard;
