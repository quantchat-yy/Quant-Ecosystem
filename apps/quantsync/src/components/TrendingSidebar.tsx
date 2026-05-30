'use client';

// ============================================================================
// QuantSync - TrendingSidebar Component
// Trending topics sidebar widget
// ============================================================================

import { StaggerList } from '@quant/shared-ui';
import type { TrendingTopic } from '../types';

interface TrendingSidebarProps {
  topics?: TrendingTopic[];
  maxItems?: number;
}

export function TrendingSidebar({ topics = [], maxItems = 10 }: TrendingSidebarProps) {
  const displayTopics = topics.slice(0, maxItems);

  if (displayTopics.length === 0) {
    return (
      <aside
        className="hidden lg:block flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--quant-card)] shadow-sm"
        aria-label="Trending topics"
      >
        <h3 className="border-b border-gray-100 dark:border-gray-700 px-4 py-3 text-lg font-bold text-gray-900 dark:text-gray-100">
          Trending
        </h3>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">No trending topics right now.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="hidden lg:flex flex-col rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[var(--quant-card)] shadow-sm"
      aria-label="Trending topics"
    >
      <h3 className="border-b border-gray-100 dark:border-gray-700 px-4 py-3 text-lg font-bold text-gray-900 dark:text-gray-100">
        Trending
      </h3>
      <StaggerList className="flex flex-col divide-y divide-gray-100 dark:divide-gray-700">
        {displayTopics.map((topic, index) => (
          <li
            key={topic.id}
            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-500 dark:text-gray-400">
              {index + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">{topic.category}</span>
              <a
                className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                href={`/hashtag/${topic.name}`}
                aria-label={`Trending: ${topic.hashtag}`}
              >
                {topic.hashtag}
              </a>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatCount(topic.postCount)} posts
              </span>
            </div>
            {topic.velocity > 2 && (
              <span className="ml-auto inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                Hot
              </span>
            )}
          </li>
        ))}
      </StaggerList>
      <a
        className="block border-t border-gray-100 dark:border-gray-700 px-4 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        href="/trending"
        aria-label="Show more trending topics"
      >
        Show more
      </a>
    </aside>
  );
}

function formatCount(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export default TrendingSidebar;
