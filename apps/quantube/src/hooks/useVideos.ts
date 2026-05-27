import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useVideos(category?: string, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['videos', category],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.getVideos({ page: pageParam, limit, category });
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load videos');
      }
      return {
        videos: response.data?.videos ?? [],
        page: pageParam,
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.videos.length < limit) return undefined;
      return lastPage.page + 1;
    },
  });
}

export default useVideos;
