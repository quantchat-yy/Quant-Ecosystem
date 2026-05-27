import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useConversations() {
  return useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const response = await apiClient.getConversations();
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load conversations');
      }
      return response.data ?? [];
    },
  });
}

export default useConversations;
