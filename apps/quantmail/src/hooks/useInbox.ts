import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';

export function useInbox(options?: {
  label?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ['inbox', options?.label, options?.category, options?.page],
    queryFn: async () => {
      const response = await apiClient.getEmails(options);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to load inbox');
      }
      return response.data ?? [];
    },
  });
}

export default useInbox;
