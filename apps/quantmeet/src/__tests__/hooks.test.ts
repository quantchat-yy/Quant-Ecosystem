import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useMeeting, useCreateRoom, useJoinRoom } from '../hooks/useMeeting';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMeeting', () => {
  it('fetches meeting info when roomId is provided', async () => {
    const meeting = {
      id: 'room-1',
      title: 'Standup',
      hostId: 'u1',
      status: 'active',
      participantCount: 3,
      isRecording: false,
      startedAt: '2024-01-01T09:00:00Z',
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => meeting });

    const { result } = renderHook(() => useMeeting('room-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(meeting);
    expect(mockFetch).toHaveBeenCalledWith('/api/rooms/room-1');
  });

  it('does not fetch when roomId is empty', async () => {
    const { result } = renderHook(() => useMeeting(''), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('handles fetch error', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const { result } = renderHook(() => useMeeting('room-bad'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Failed to fetch meeting info');
  });

  it('uses correct query key with roomId', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'r2',
        title: '',
        hostId: '',
        status: 'waiting',
        participantCount: 0,
        isRecording: false,
        startedAt: null,
      }),
    });

    const { result } = renderHook(() => useMeeting('r2'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith('/api/rooms/r2');
  });
});

describe('useCreateRoom', () => {
  it('calls POST /api/rooms with title', async () => {
    const room = {
      id: 'new-room',
      title: 'My Meeting',
      hostId: 'u1',
      status: 'waiting',
      participantCount: 0,
      isRecording: false,
      startedAt: null,
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => room });

    const { result } = renderHook(() => useCreateRoom(), { wrapper: createWrapper() });

    const data = await result.current.mutateAsync({ title: 'My Meeting' });

    expect(data).toEqual(room);
    expect(mockFetch).toHaveBeenCalledWith('/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Meeting' }),
    });
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useCreateRoom(), { wrapper: createWrapper() });

    await expect(result.current.mutateAsync({ title: 'X' })).rejects.toThrow(
      'Failed to create room',
    );
  });

  it('sets query cache with returned meeting data', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const room = {
      id: 'cached-room',
      title: 'Cached',
      hostId: 'u1',
      status: 'waiting',
      participantCount: 0,
      isRecording: false,
      startedAt: null,
    };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => room });

    const { result } = renderHook(() => useCreateRoom(), { wrapper });

    await result.current.mutateAsync({ title: 'Cached' });

    await waitFor(() => {
      const cached = queryClient.getQueryData(['meeting', 'cached-room']);
      expect(cached).toEqual(room);
    });
  });
});

describe('useJoinRoom', () => {
  it('calls POST /api/rooms/{id}/join with displayName', async () => {
    const response = { token: 'tok-123', participantId: 'p1' };
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => response });

    const { result } = renderHook(() => useJoinRoom(), { wrapper: createWrapper() });

    const data = await result.current.mutateAsync({ roomId: 'room-1', displayName: 'Alice' });

    expect(data).toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith('/api/rooms/room-1/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: 'Alice' }),
    });
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

    const { result } = renderHook(() => useJoinRoom(), { wrapper: createWrapper() });

    await expect(
      result.current.mutateAsync({ roomId: 'room-1', displayName: 'Bob' }),
    ).rejects.toThrow('Failed to join room');
  });

  it('invalidates participants query on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 't', participantId: 'p' }),
    });

    const { result } = renderHook(() => useJoinRoom(), { wrapper });

    await result.current.mutateAsync({ roomId: 'room-5', displayName: 'Charlie' });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['participants', 'room-5'] });
    });
  });
});
