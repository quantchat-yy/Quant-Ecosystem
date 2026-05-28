// ============================================================================
// QuantNeon - ExploreGrid Component
// ============================================================================

interface ExploreItem {
  id: string;
  thumbnailUrl: string;
  type: 'post' | 'reel' | 'product';
  likes?: number;
}

interface ExploreGridProps {
  items: ExploreItem[];
  onItemClick?: (id: string) => void;
}

export function ExploreGrid({ items, onItemClick }: ExploreGridProps) {
  return (
    <div className="grid grid-cols-3 gap-0.5" role="grid" aria-label="Explore content">
      {items.map((item, i) => {
        const isLarge = i % 9 === 0 || i % 9 === 4;
        return (
          <button
            type="button"
            key={item.id}
            className={`relative overflow-hidden bg-gray-900 ${
              isLarge ? 'col-span-2 row-span-2' : ''
            }`}
            onClick={() => onItemClick?.(item.id)}
            aria-label={`${item.type} item${item.likes != null ? `, ${item.likes} likes` : ''}`}
          >
            <img
              src={item.thumbnailUrl}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover aspect-square"
            />
            {item.type === 'reel' && (
              <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">
                Reel
              </span>
            )}
            {item.type === 'product' && (
              <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-full">
                Shop
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default ExploreGrid;
