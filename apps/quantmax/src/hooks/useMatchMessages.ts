import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useMatchMessages(matchId: string) {
  return useQuery({
    queryKey: ['match-messages', matchId],
    queryFn: async () => {
      const response = await apiClient.getMessages(matchId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load messages');
      }
      return response.data ?? [];
    },
    enabled: !!matchId,
  });
}

export default useMatchMessages;
