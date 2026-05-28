import { C2PAStamper } from '../provenance/c2pa-stamp.js';

describe('C2PAStamper', () => {
  const stamper = new C2PAStamper();

  it('creates stamp with all fields', () => {
    const credential = stamper.stamp('asset-1', {
      model: 'sd3',
      prompt: 'a cat',
      userId: 'user-1',
    });
    expect(credential.assetId).toBe('asset-1');
    expect(credential.model).toBe('sd3');
    expect(credential.prompt).toBe('a cat');
    expect(credential.userId).toBe('user-1');
    expect(credential.timestamp).toBeGreaterThan(0);
    expect(credential.signature).toBeTruthy();
  });

  it('verifies stamped asset', () => {
    stamper.stamp('asset-2', { model: 'flux', prompt: 'a dog', userId: 'user-2' });
    const result = stamper.verify('asset-2');
    expect(result).not.toBeNull();
    expect(result!.assetId).toBe('asset-2');
  });

  it('returns null for unknown assets', () => {
    const result = stamper.verify('nonexistent');
    expect(result).toBeNull();
  });
});
