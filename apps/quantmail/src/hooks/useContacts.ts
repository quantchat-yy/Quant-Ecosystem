import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api-client';
import type { Contact } from '../types';

export function useContacts(options?: {
  q?: string;
  tag?: string;
  favorites?: boolean;
  page?: number;
}) {
  return useQuery({
    queryKey: ['contacts', options],
    queryFn: async () => {
      const response = await apiClient.getContacts(options);
      if (!response.success) throw new Error(response.error?.message || 'Failed to load contacts');
      return response.data ?? [];
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Contact>) => {
      const response = await apiClient.createContact(data);
      if (!response.success) throw new Error(response.error?.message || 'Failed to create contact');
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const response = await apiClient.updateContact(id, data);
      if (!response.success) throw new Error(response.error?.message || 'Failed to update contact');
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.deleteContact(id);
      if (!response.success) throw new Error(response.error?.message || 'Failed to delete contact');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}
