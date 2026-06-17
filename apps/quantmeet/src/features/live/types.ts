// ============================================================================
// quantmeet — quant-live surface DTOs (Layer 5 request/response contracts)
// ============================================================================
//
// Frontend-facing data shapes for the quant-live api-client hooks. These mirror
// the JSON the quantmeet backend quant-live routes return (see
// apps/quantmeet/backend/routes/quant-live.ts) and are intentionally decoupled
// from the `@quant/quant-live` engine's internal types so a backend refactor
// never forces a frontend type change. Every hook is typed against the
// `{ success, data }` envelope via `APIResponse<T>` from the SDK.

export type LiveSessionState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'speaking'
  | 'interrupted'
  | 'ended';

export interface LiveVadConfigInput {
  threshold?: number;
  silenceDuration?: number;
  minSpeechDuration?: number;
}

export interface LiveSessionConfigInput {
  asrProvider?: string;
  vadConfig?: LiveVadConfigInput;
  enableInterruption?: boolean;
  maxSessionDuration?: number;
  language?: string;
}

/** Body for POST /api/quant-live/sessions. */
export interface CreateLiveSessionInput {
  config?: LiveSessionConfigInput;
}

export interface LiveTranscriptSegment {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  startTime: number;
  endTime: number;
  confidence: number;
  isFinal: boolean;
}

/** In-memory live session (state machine) returned on create / by id. */
export interface LiveSession {
  id: string;
  state: LiveSessionState;
  createdAt: number;
  transcript: LiveTranscriptSegment[];
}

/** Persisted session store entry, scoped to a user. */
export interface LiveSessionEntry {
  id: string;
  state: LiveSessionState;
  createdAt: number;
  endedAt?: number;
  duration?: number;
  userId: string;
  transcript: LiveTranscriptSegment[];
  artifacts: unknown[];
  metadata?: Record<string, unknown>;
}

export interface CreateLiveSessionResponse {
  session: LiveSession;
  entry: LiveSessionEntry;
}

export interface ListLiveSessionsResponse {
  entries: LiveSessionEntry[];
  total: number;
}

export interface GetLiveSessionResponse {
  session?: LiveSession;
  entry?: LiveSessionEntry;
}

export interface LiveSessionSearchResult {
  entry: LiveSessionEntry;
  matchingSnippets: string[];
  score: number;
}

export interface SearchLiveSessionsResponse {
  results: LiveSessionSearchResult[];
}
