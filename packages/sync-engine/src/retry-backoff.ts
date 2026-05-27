// ============================================================================
// Retry with Exponential Backoff
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: string[];
}

const DEFAULT_RETRYABLE_ERRORS = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'network',
  'timeout',
  '503',
  '429',
];

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

export class RetryWithBackoff {
  private readonly config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;

        if (!this.shouldRetry(error, attempt)) {
          throw error;
        }

        const delay = this.getDelay(attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  getDelay(attempt: number): number {
    const baseDelay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt);
    const capped = Math.min(baseDelay, this.config.maxDelayMs);

    if (this.config.jitter) {
      // Add 0-25% jitter
      const jitterFactor = 1 + Math.random() * 0.25;
      return Math.min(Math.floor(capped * jitterFactor), this.config.maxDelayMs);
    }

    return capped;
  }

  shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.config.maxRetries) {
      return false;
    }
    return this.isRetryable(error);
  }

  isRetryable(error: unknown): boolean {
    const patterns = this.config.retryableErrors ?? DEFAULT_RETRYABLE_ERRORS;
    const message = this.getErrorMessage(error);

    return patterns.some((pattern) => message.toLowerCase().includes(pattern.toLowerCase()));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return String(error);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
