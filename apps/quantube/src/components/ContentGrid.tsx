// ============================================================================
// QuantTube - ContentGrid Component
// Responsive grid for videos/shows/music content cards
// ============================================================================

interface ContentItem {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration?: number;
  views?: number;
  channelName?: string;
  artistName?: string;
  type: 'video' | 'track' | 'show' | 'short';
}

interface ContentGridProps {
  items: ContentItem[];
  layout: 'grid' | 'list' | 'compact';
  columns?: number;
  onItemClick?: (id: string) => void;
}

export function ContentGrid({ items, layout, columns = 4, onItemClick }: ContentGridProps) {
  const gridStyle =
    layout === 'grid' ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined;

  return (
    <div
      className={`${layout === 'grid' ? 'grid gap-4' : layout === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-2 gap-2'}`}
      style={gridStyle}
      role="list"
      aria-label="Content grid"
    >
      {items.map((item) =>
        layout === 'list' ? (
          <ListItem key={item.id} item={item} onItemClick={onItemClick} />
        ) : (
          <GridItem key={item.id} item={item} onItemClick={onItemClick} />
        ),
      )}
    </div>
  );
}

function GridItem({
  item,
  onItemClick,
}: {
  item: ContentItem;
  onItemClick?: (id: string) => void;
}) {
  return (
    <button
      type="button"
      role="listitem"
      className="flex flex-col rounded-lg overflow-hidden bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer text-left"
      data-id={item.id}
      onClick={() => onItemClick?.(item.id)}
      aria-label={`${item.title} - ${item.channelName || item.artistName || ''}`}
    >
      <div className="relative aspect-video">
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {item.duration != null && (
          <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 py-0.5 rounded">
            {formatDuration(item.duration)}
          </span>
        )}
        {item.type === 'short' && (
          <span className="absolute top-1 left-1 bg-red-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            SHORT
          </span>
        )}
      </div>
      <div className="p-2 flex flex-col gap-1">
        <h3 className="text-sm font-medium text-white line-clamp-2">{item.title}</h3>
        <p className="text-xs text-gray-400">{item.channelName || item.artistName || ''}</p>
        {item.views != null && (
          <p className="text-xs text-gray-500">{formatViews(item.views)} views</p>
        )}
      </div>
    </button>
  );
}

function ListItem({
  item,
  onItemClick,
}: {
  item: ContentItem;
  onItemClick?: (id: string) => void;
}) {
  return (
    <button
      type="button"
      role="listitem"
      className="flex items-center gap-3 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors cursor-pointer text-left"
      data-id={item.id}
      onClick={() => onItemClick?.(item.id)}
      aria-label={`${item.title} - ${item.channelName || item.artistName || ''}`}
    >
      <img
        src={item.thumbnailUrl}
        alt={item.title}
        className="w-40 h-24 object-cover rounded flex-shrink-0"
      />
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <h3 className="text-sm font-medium text-white truncate">{item.title}</h3>
        <p className="text-xs text-gray-400">{item.channelName || item.artistName || ''}</p>
        {item.views != null && (
          <span className="text-xs text-gray-500">{formatViews(item.views)} views</span>
        )}
      </div>
      {item.duration != null && (
        <span className="text-xs text-gray-400 flex-shrink-0">{formatDuration(item.duration)}</span>
      )}
    </button>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
  if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
  if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
  return views.toString();
}

export default ContentGrid;
