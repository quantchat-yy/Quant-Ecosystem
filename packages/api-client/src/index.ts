// ============================================================================
// @quant/api-client - Typed React Query API Client SDK
// ============================================================================

// Proxy utility for Next.js API routes
export { proxyToBackend } from './proxy';
export type { ProxyOptions } from './proxy';

// Core
export { HttpClient } from './core/http-client';
export { TokenManager } from './core/token-manager';
export type { TokenManagerConfig } from './core/token-manager';
export { createApiClient } from './core/create-client';
export type { CreateApiClientConfig, ApiClientInstance } from './core/create-client';
export type {
  APIResponse,
  APIError,
  PaginatedResponse,
  RequestConfig,
  QueryOptions,
  RefreshConfig,
} from './core/types';

// Hooks (factory pattern — bind to an HttpClient instance)
export { createQueryHook } from './hooks/useQuery';
export { createMutationHook } from './hooks/useMutation';
export { createInfiniteQueryHook } from './hooks/useInfiniteQuery';
export { useSubscription } from './hooks/useSubscription';
export type { SubscriptionOptions, SubscriptionState } from './hooks/useSubscription';

// Hooks (standalone — the canonical Layer-5 seam: UI -> same-origin Next proxy).
// These are the *only* sanctioned call path from a UI surface to an engine-backed
// endpoint (Requirement 1.4: "api-client only, no inline fetch to the backend").
export { useApiQuery } from './hooks/useApiQuery';
export type { UseApiQueryOptions } from './hooks/useApiQuery';
export { useApiMutation } from './hooks/useApiMutation';
export type { UseApiMutationOptions } from './hooks/useApiMutation';
export { apiFetch, buildPath } from './core/api-fetch';
export type { ApiMethod, ApiFetchInit } from './core/api-fetch';

// Endpoints
export { createChatHooks } from './endpoints/chat';
export type { Conversation, Message, SendMessageParams } from './endpoints/chat';
export { createMailHooks } from './endpoints/mail';
export type { Email, SendEmailParams, SearchEmailsParams } from './endpoints/mail';
export { createAIHooks } from './endpoints/ai';
export type {
  AIChatParams,
  AIChatResponse,
  AIStreamParams,
  AIStreamResponse,
} from './endpoints/ai';
