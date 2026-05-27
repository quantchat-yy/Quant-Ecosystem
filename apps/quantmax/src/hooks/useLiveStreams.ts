import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useLiveStreams() {
  return useQuery({
    queryKey: ['live-streams'],
    queryFn: async () => {
      const response = await apiClient.getLiveStreams();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load live streams');
      }
      return response.data ?? [];
    },
  });
}

export default useLiveStreams;
