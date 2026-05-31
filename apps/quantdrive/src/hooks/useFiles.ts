'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size: number;
  mimeType: string;
  updatedAt: string;
  createdAt: string;
  isStarred: boolean;
  path: string;
  thumbnailUrl: string | null;
}

export function useFiles(path: string) {
  return useQuery<FileItem[]>({
    queryKey: ['files', path],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (path) params.set('path', path);
      const query = params.toString();
      const url = `/api/files${query ? `?${query}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      return response.json();
    },
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage-quota'] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const response = await fetch(`/api/files?id=${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      return response.json();
    },
    onMutate: async (fileId) => {
      await queryClient.cancelQueries({ queryKey: ['files'] });
      const queries = queryClient.getQueriesData<FileItem[]>({ queryKey: ['files'] });
      queries.forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData(
            key,
            data.filter((f) => f.id !== fileId),
          );
        }
      });
      return { queries };
    },
    onError: (_err, _fileId, context) => {
      if (context?.queries) {
        context.queries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['storage-quota'] });
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, newPath }: { fileId: string; newPath: string }) => {
      const response = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId, path: newPath }),
      });
      if (!response.ok) {
        throw new Error('Failed to move file');
      }
      return response.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useRenameFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: string; newName: string }) => {
      const response = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId, name: newName }),
      });
      if (!response.ok) {
        throw new Error('Failed to rename file');
      }
      return response.json();
    },
    onMutate: async ({ fileId, newName }) => {
      await queryClient.cancelQueries({ queryKey: ['files'] });
      const queries = queryClient.getQueriesData<FileItem[]>({ queryKey: ['files'] });
      queries.forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData(
            key,
            data.map((f) => (f.id === fileId ? { ...f, name: newName } : f)),
          );
        }
      });
      return { queries };
    },
    onError: (_err, _vars, context) => {
      if (context?.queries) {
        context.queries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}

export function useStarFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fileId, isStarred }: { fileId: string; isStarred: boolean }) => {
      const response = await fetch('/api/files', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId, isStarred }),
      });
      if (!response.ok) {
        throw new Error('Failed to update star status');
      }
      return response.json();
    },
    onMutate: async ({ fileId, isStarred }) => {
      await queryClient.cancelQueries({ queryKey: ['files'] });
      const queries = queryClient.getQueriesData<FileItem[]>({ queryKey: ['files'] });
      queries.forEach(([key, data]) => {
        if (data) {
          queryClient.setQueryData(
            key,
            data.map((f) => (f.id === fileId ? { ...f, isStarred } : f)),
          );
        }
      });
      return { queries };
    },
    onError: (_err, _vars, context) => {
      if (context?.queries) {
        context.queries.forEach(([key, data]) => {
          queryClient.setQueryData(key, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });
}
