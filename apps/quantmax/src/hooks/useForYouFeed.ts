import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useForYouFeed(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['max-feed', limit],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await apiClient.getForYouFeed(limit);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load feed');
      }
      return {
        videos: response.data ?? [],
        nextPage: pageParam + 1,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      if (lastPage.videos.length < limit) return undefined;
      return lastPage.nextPage;
    },
  });
}

export default useForYouFeed;
