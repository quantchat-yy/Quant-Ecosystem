import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type DMConversation, type DirectMessage } from '../services/api-client';

/** The viewer's DM conversation list (newest activity first, with unread counts). */
export function useConversations() {
  return useQuery<DMConversation[]>({
    queryKey: ['neon-dm-conversations'],
    queryFn: async () => {
      const res = await apiClient.getConversations();
      if (!res.success) throw new Error(res.error?.message || 'Failed to load conversations');
      return res.data?.conversations ?? [];
    },
    refetchInterval: 15000,
  });
}

/** Messages in a single conversation (chronological). */
export function useConversationMessages(conversationId: string | null) {
  return useQuery<DirectMessage[]>({
    queryKey: ['neon-dm-messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await apiClient.getMessages(conversationId);
      if (!res.success) throw new Error(res.error?.message || 'Failed to load messages');
      return res.data?.messages ?? [];
    },
    enabled: !!conversationId,
    refetchInterval: conversationId ? 8000 : false,
  });
}

/** Send a message into a conversation and refresh the thread + inbox. */
export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, text }: { conversationId: string; text: string }) => {
      const res = await apiClient.sendMessage(conversationId, text);
      if (!res.success) throw new Error(res.error?.message || 'Failed to send');
      return res.data?.message as DirectMessage;
    },
    onSuccess: (_msg, vars) => {
      qc.invalidateQueries({ queryKey: ['neon-dm-messages', vars.conversationId] });
      qc.invalidateQueries({ queryKey: ['neon-dm-conversations'] });
    },
  });
}

/** Mark a conversation read for the viewer. */
export function useMarkConversationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      await apiClient.markConversationRead(conversationId);
      return conversationId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['neon-dm-conversations'] });
    },
  });
}
