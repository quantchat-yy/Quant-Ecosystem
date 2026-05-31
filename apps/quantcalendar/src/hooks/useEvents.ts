import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  calendarId: string;
  color: string;
  isRecurring: boolean;
  location: string;
}

export type CreateEventInput = Omit<CalendarEvent, 'id'>;
export type UpdateEventInput = Partial<CalendarEvent> & { id: string };

export function useEvents(options?: { calendarId?: string; start?: string; end?: string }) {
  return useQuery<CalendarEvent[]>({
    queryKey: ['events', options?.calendarId, options?.start, options?.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.calendarId) params.set('calendarId', options.calendarId);
      if (options?.start) params.set('start', options.start);
      if (options?.end) params.set('end', options.end);
      const query = params.toString();
      const url = `/api/events${query ? `?${query}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await response.json();
      return data;
    },
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();

  return useMutation<CalendarEvent, Error, CreateEventInput>({
    mutationFn: async (input) => {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('Failed to create event');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation<CalendarEvent, Error, UpdateEventInput>({
    mutationFn: async (input) => {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('Failed to update event');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (eventId) => {
      const response = await fetch('/api/events', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: eventId }),
      });
      if (!response.ok) {
        throw new Error('Failed to delete event');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
