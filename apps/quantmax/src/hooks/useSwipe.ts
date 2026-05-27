import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import type { MatchAction } from '../types';

export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, action }: { targetId: string; action: MatchAction }) => {
      const response = await apiClient.swipe(targetId, action);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to swipe');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}

export default useSwipe;
