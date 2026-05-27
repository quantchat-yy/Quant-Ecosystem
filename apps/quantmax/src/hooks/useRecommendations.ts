import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useRecommendations(limit?: number) {
  return useQuery({
    queryKey: ['recommendations', limit],
    queryFn: async () => {
      const response = await apiClient.getRecommendations(limit);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load recommendations');
      }
      return response.data ?? [];
    },
  });
}

export default useRecommendations;
