import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Calendar {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
}

export type CreateCalendarInput = Omit<Calendar, 'id'>;
export type UpdateCalendarInput = Partial<Calendar> & { id: string };

export function useCalendars() {
  return useQuery<Calendar[]>({
    queryKey: ['calendars'],
    queryFn: async () => {
      const response = await fetch('/api/calendars');
      if (!response.ok) {
        throw new Error('Failed to fetch calendars');
      }
      const data = await response.json();
      return data;
    },
  });
}

export function useCreateCalendar() {
  const queryClient = useQueryClient();

  return useMutation<Calendar, Error, CreateCalendarInput>({
    mutationFn: async (input) => {
      const response = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('Failed to create calendar');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}

export function useUpdateCalendar() {
  const queryClient = useQueryClient();

  return useMutation<Calendar, Error, UpdateCalendarInput>({
    mutationFn: async (input) => {
      const response = await fetch('/api/calendars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error('Failed to update calendar');
      }
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}

export function useDeleteCalendar() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (calendarId) => {
      const response = await fetch('/api/calendars', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: calendarId }),
      });
      if (!response.ok) {
        throw new Error('Failed to delete calendar');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendars'] });
    },
  });
}
