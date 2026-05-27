import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useMatches() {
  return useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      const response = await apiClient.getMatches();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load matches');
      }
      return response.data ?? [];
    },
  });
}

export default useMatches;
