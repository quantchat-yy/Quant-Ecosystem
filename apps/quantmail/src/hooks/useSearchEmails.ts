import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import type { SearchEmailRequest } from '../types';

export function useSearchEmails(params: Partial<SearchEmailRequest> | null) {
  return useQuery({
    queryKey: ['email-search', params],
    queryFn: async () => {
      if (!params) return [];
      const response = await apiClient.searchEmails(params);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to search emails');
      }
      return response.data ?? [];
    },
    enabled: !!params,
  });
}

export default useSearchEmails;
