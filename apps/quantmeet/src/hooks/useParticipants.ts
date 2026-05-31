import { useQuery } from '@tanstack/react-query';

export interface Participant {
  id: string;
  displayName: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  joinedAt: string;
}

export function useParticipants(roomId: string) {
  return useQuery<Participant[]>({
    queryKey: ['participants', roomId],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}/participants`);
      if (!response.ok) {
        throw new Error('Failed to fetch participants');
      }
      return response.json();
    },
    enabled: !!roomId,
    refetchInterval: 5000,
  });
}
