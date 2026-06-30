// ============================================================================
// AI Providers - Barrel
// ============================================================================

export {
  OpenRouterProvider,
  loadOpenRouterConfig,
  estimateTokenCount,
  DEFAULT_OPENROUTER_BASE_URL,
} from './openrouter-provider';
export type { OpenRouterConfig, OpenRouterAdapterOptions, FetchLike } from './openrouter-provider';

export { resolveUserModel, resolveUserModelDetailed, isModelAllowed } from './resolve-user-model';
export type {
  ResolveUserModelOptions,
  ResolvedUserModel,
  ModelResolutionSource,
} from './resolve-user-model';
