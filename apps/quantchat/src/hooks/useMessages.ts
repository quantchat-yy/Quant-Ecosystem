import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useMessages(conversationId: string) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const response = await apiClient.getMessages(conversationId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load messages');
      }
      return response.data ?? [];
    },
    enabled: !!conversationId,
  });
}

export default useMessages;
