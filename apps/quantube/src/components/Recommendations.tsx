// ============================================================================
// QuantTube - Recommendations Component
// AI recommendation sidebar with personalized content suggestions
// ============================================================================

import type { Recommendation } from '../types';

interface RecommendationsProps {
  recommendations: Recommendation[];
  title: string;
  loading: boolean;
  onItemClick: (contentId: string) => void;
  onRefresh: () => void;
}

export function Recommendations({
  recommendations,
  title,
  loading,
  onItemClick,
  onRefresh,
}: RecommendationsProps) {
  if (loading) {
    return (
      <aside
        className="flex flex-col gap-3 p-4"
        aria-label="Loading recommendations"
        aria-busy="true"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-40 h-24 bg-gray-700 rounded flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-700 rounded w-1/2" />
              <div className="h-3 bg-gray-700 rounded w-1/4" />
            </div>
          </div>
        ))}
      </aside>
    );
  }

  return (
    <aside className="flex flex-col gap-3" aria-label="Recommendations">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Refresh recommendations"
        >
          Refresh
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2 px-2" role="list" aria-label="Recommended content">
        {recommendations.map((rec) => (
          <div
            key={rec.contentId}
            role="listitem"
            className="flex gap-3 p-2 rounded-lg hover:bg-gray-800 cursor-pointer transition-colors"
            data-id={rec.contentId}
            data-score={rec.score.toFixed(3)}
            onClick={() => onItemClick(rec.contentId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onItemClick(rec.contentId);
            }}
            tabIndex={0}
            aria-label={`${rec.contentId} - ${rec.reason}`}
          >
            <div className="w-40 h-24 bg-gray-700 rounded flex-shrink-0" aria-hidden="true" />
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{rec.contentId}</p>
              <span className="text-xs text-gray-400 line-clamp-2">{rec.reason}</span>
              <span className="inline-flex self-start px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300 rounded">
                {rec.contentType}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

export default Recommendations;
