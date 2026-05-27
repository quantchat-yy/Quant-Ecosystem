import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useComments(contentId: string) {
  return useQuery({
    queryKey: ['comments', contentId],
    queryFn: async () => {
      const response = await apiClient.getComments(contentId);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load comments');
      }
      return response.data ?? [];
    },
    enabled: !!contentId,
  });
}

export default useComments;
