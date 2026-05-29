import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useThread(threadId: string) {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      const response = await apiClient.getThread(threadId);
      if (!response.success) throw new Error(response.error?.message || 'Failed to load thread');
      return response.data!;
    },
    enabled: !!threadId,
  });
}

export default useThread;
