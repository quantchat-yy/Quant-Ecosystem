// ============================================================================
// AI Core - Typed Errors
// ============================================================================

/**
 * Thrown when an AI inference cannot be completed against a real provider and
 * the engine is configured to fail closed (production / failClosed mode).
 *
 * This is the explicit, typed error that replaces the silent mock-response
 * fallback so that production never returns a fabricated/simulated payload.
 *
 * Satisfies Requirements 3.1 and 3.3 (fail-closed AI engine).
 */
export class AIProviderUnavailableError extends Error {
  /** Stable, machine-readable error code for callers/telemetry. */
  readonly code = 'AI_PROVIDER_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'AIProviderUnavailableError';
    // Restore prototype chain for instanceof checks across transpilation targets.
    Object.setPrototypeOf(this, AIProviderUnavailableError.prototype);
  }
}
