import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface MeetingInfo {
  id: string;
  title: string;
  hostId: string;
  status: 'waiting' | 'active' | 'ended';
  participantCount: number;
  isRecording: boolean;
  startedAt: string | null;
}

export function useMeeting(roomId: string) {
  return useQuery<MeetingInfo>({
    queryKey: ['meeting', roomId],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meeting info');
      }
      return response.json();
    },
    enabled: !!roomId,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { title?: string }) => {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        throw new Error('Failed to create room');
      }
      return response.json() as Promise<MeetingInfo>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['meeting', data.id], data);
    },
  });
}

export function useJoinRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { roomId: string; displayName: string }) => {
      const response = await fetch(`/api/rooms/${params.roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: params.displayName }),
      });
      if (!response.ok) {
        throw new Error('Failed to join room');
      }
      return response.json() as Promise<{ token: string; participantId: string }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['participants', variables.roomId] });
    },
  });
}
