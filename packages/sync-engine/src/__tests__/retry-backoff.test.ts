import { describe, it, expect, vi } from 'vitest';
import { RetryWithBackoff } from '../retry-backoff.js';

describe('RetryWithBackoff', () => {
  it('should return result on first successful call', async () => {
    const retry = new RetryWithBackoff({ jitter: false, initialDelayMs: 1 });
    const fn = vi.fn().mockResolvedValue('success');

    const result = await retry.execute(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error and succeed', async () => {
    const retry = new RetryWithBackoff({ jitter: false, initialDelayMs: 1 });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('recovered');

    const result = await retry.execute(fn);
    expect(result).toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after exhausting retries', async () => {
    const retry = new RetryWithBackoff({
      maxRetries: 2,
      initialDelayMs: 1,
      maxDelayMs: 5,
      jitter: false,
    });
    const fn = vi.fn().mockRejectedValue(new Error('ETIMEDOUT'));

    await expect(retry.execute(fn)).rejects.toThrow('ETIMEDOUT');
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should not retry non-retryable errors', async () => {
    const retry = new RetryWithBackoff({ jitter: false, initialDelayMs: 1 });
    const fn = vi.fn().mockRejectedValue(new Error('Invalid input'));

    await expect(retry.execute(fn)).rejects.toThrow('Invalid input');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should calculate exponential delay without jitter', () => {
    const retry = new RetryWithBackoff({
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 30000,
      jitter: false,
    });

    expect(retry.getDelay(0)).toBe(1000);
    expect(retry.getDelay(1)).toBe(2000);
    expect(retry.getDelay(2)).toBe(4000);
    expect(retry.getDelay(3)).toBe(8000);
  });

  it('should cap delay at maxDelayMs', () => {
    const retry = new RetryWithBackoff({
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 5000,
      jitter: false,
    });

    expect(retry.getDelay(10)).toBe(5000);
  });

  it('should add jitter within 0-25% range', () => {
    const retry = new RetryWithBackoff({
      initialDelayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 30000,
      jitter: true,
    });

    // Run multiple times to check bounds
    for (let i = 0; i < 50; i++) {
      const delay = retry.getDelay(0);
      // Base delay is 1000, jitter adds 0-25%, so range is [1000, 1250]
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThanOrEqual(1250);
    }
  });

  it('should identify retryable errors correctly', () => {
    const retry = new RetryWithBackoff();

    expect(retry.isRetryable(new Error('ECONNRESET'))).toBe(true);
    expect(retry.isRetryable(new Error('ETIMEDOUT'))).toBe(true);
    expect(retry.isRetryable(new Error('ECONNREFUSED'))).toBe(true);
    expect(retry.isRetryable(new Error('network failure'))).toBe(true);
    expect(retry.isRetryable(new Error('request timeout'))).toBe(true);
    expect(retry.isRetryable(new Error('HTTP 503 Service Unavailable'))).toBe(true);
    expect(retry.isRetryable(new Error('HTTP 429 Too Many Requests'))).toBe(true);
  });

  it('should identify non-retryable errors correctly', () => {
    const retry = new RetryWithBackoff();

    expect(retry.isRetryable(new Error('Invalid input'))).toBe(false);
    expect(retry.isRetryable(new Error('Not found'))).toBe(false);
    expect(retry.isRetryable(new Error('Permission denied'))).toBe(false);
  });

  it('should support custom retryable error patterns', () => {
    const retry = new RetryWithBackoff({
      retryableErrors: ['CUSTOM_ERROR', 'ANOTHER_ERROR'],
    });

    expect(retry.isRetryable(new Error('CUSTOM_ERROR occurred'))).toBe(true);
    expect(retry.isRetryable(new Error('ANOTHER_ERROR happened'))).toBe(true);
    expect(retry.isRetryable(new Error('ECONNRESET'))).toBe(false); // default not included
  });

  it('should handle shouldRetry with attempt check', () => {
    const retry = new RetryWithBackoff({ maxRetries: 3 });

    expect(retry.shouldRetry(new Error('ECONNRESET'), 0)).toBe(true);
    expect(retry.shouldRetry(new Error('ECONNRESET'), 2)).toBe(true);
    expect(retry.shouldRetry(new Error('ECONNRESET'), 3)).toBe(false); // at max
    expect(retry.shouldRetry(new Error('Invalid'), 0)).toBe(false); // non-retryable
  });
});
