import { describe, it, expect } from 'vitest';
import { WebFingerHandler, WebFingerResponseSchema } from './webfinger.js';

describe('WebFingerHandler', () => {
  const handler = new WebFingerHandler();

  it('valid acct query returns correct JRD with subject and self link', () => {
    const result = handler.handle('acct:alice@example.com', 'example.com');

    expect(result.subject).toBe('acct:alice@example.com');
    expect(result.links).toHaveLength(1);
    expect(result.links[0]!.rel).toBe('self');
    expect(result.links[0]!.type).toBe('application/activity+json');
    expect(result.links[0]!.href).toBe('https://example.com/users/alice');
  });

  it('invalid resource format throws', () => {
    expect(() => handler.handle('invalid-format', 'example.com')).toThrow(
      'Invalid resource format',
    );
  });

  it('response matches schema', () => {
    const result = handler.handle('acct:bob@social.test', 'social.test');
    const parsed = WebFingerResponseSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});
