// ============================================================================
// quantmeet — quant-live api-client hooks (Layer 5)
// ============================================================================
//
// The ONLY sanctioned call path from a quantmeet UI surface to the quant-live
// (voice) engine: typed react-query hooks over the same-origin Next proxy paths
// under `/api/quant-live/*` (never inline fetch — Requirement 1.4). The proxy
// forwards the bearer + x-request-id to the backend (Layer 4), which reaches the
// decorated `@quant/quant-live` engine (Layer 2/3).
//
// NOTE: paths use the `/quant-live` prefix (NOT `/live`) so the backend route
// does not collide with createApp()'s `/live` PUBLIC_PATHS liveness entry that
// would bypass the global auth hook (Req 7.1/7.3).
import { useApiQuery, useApiMutation } from '@quant/api-client';
import type { UseApiQueryOptions } from '@quant/api-client';
import type {
  CreateLiveSessionInput,
  CreateLiveSessionResponse,
  GetLiveSessionResponse,
  ListLiveSessionsResponse,
  SearchLiveSessionsResponse,
} from './types';

/** POST /api/quant-live/sessions — start a voice session through the engine. */
export function useCreateLiveSession() {
  return useApiMutation<CreateLiveSessionInput, CreateLiveSessionResponse>(
    '/api/quant-live/sessions',
  );
}

/** GET /api/quant-live/sessions — list the current user's persisted live sessions. */
export function useLiveSessions(options?: UseApiQueryOptions) {
  return useApiQuery<ListLiveSessionsResponse>('/api/quant-live/sessions', options);
}

/** GET /api/quant-live/sessions/:id — fetch a single live session (or its store entry). */
export function useLiveSession(id: string | undefined, options?: UseApiQueryOptions) {
  return useApiQuery<GetLiveSessionResponse>(`/api/quant-live/sessions/${id ?? ''}`, {
    ...options,
    enabled: (options?.enabled ?? true) && Boolean(id),
  });
}

/** GET /api/quant-live/search?q= — search the user's session transcripts. */
export function useLiveSessionSearch(query: string | undefined, options?: UseApiQueryOptions) {
  return useApiQuery<SearchLiveSessionsResponse>('/api/quant-live/search', {
    ...options,
    params: query ? { q: query } : undefined,
    enabled: (options?.enabled ?? true) && Boolean(query),
  });
}
