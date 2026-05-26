import { describe, it, expect } from 'vitest';
import { NoOpCSAMMatcher } from './csam-matcher';

describe('NoOpCSAMMatcher', () => {
  it('should always return matched: false', async () => {
    const matcher = new NoOpCSAMMatcher();
    const result = await matcher.checkHash('abc123');

    expect(result.matched).toBe(false);
    expect(result.reportId).toBeUndefined();
  });

  it('should not throw on reportMatch', async () => {
    const matcher = new NoOpCSAMMatcher();
    await expect(matcher.reportMatch({ hash: 'abc123', source: 'test' })).resolves.toBeUndefined();
  });

  it('should handle empty hash', async () => {
    const matcher = new NoOpCSAMMatcher();
    const result = await matcher.checkHash('');

    expect(result.matched).toBe(false);
  });

  it('implements CSAMMatcherInterface correctly', async () => {
    const matcher = new NoOpCSAMMatcher();

    // Verify interface methods exist and work
    expect(typeof matcher.checkHash).toBe('function');
    expect(typeof matcher.reportMatch).toBe('function');

    const checkResult = await matcher.checkHash('test-hash-value');
    expect(checkResult).toHaveProperty('matched');
  });
});
