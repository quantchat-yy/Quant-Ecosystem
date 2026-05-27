import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useExplore() {
  return useQuery({
    queryKey: ['neon-explore'],
    queryFn: async () => {
      const response = await apiClient.getExploreFeed();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load explore content');
      }
      return response.data ?? [];
    },
  });
}

export default useExplore;
