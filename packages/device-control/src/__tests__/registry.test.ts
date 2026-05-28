import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilityRegistry } from '../registry.js';
import type { CapabilityProvider } from '../capabilities/types.js';

describe('CapabilityRegistry', () => {
  let registry: CapabilityRegistry;

  beforeEach(() => {
    registry = new CapabilityRegistry();
  });

  it('registers and retrieves a provider', () => {
    const provider: CapabilityProvider<'phone'> = {
      capability: 'phone',
      isAvailable: async () => true,
      initialize: async () => {},
      dispose: () => {},
    };
    registry.register('phone', provider);
    expect(registry.get('phone')).toBe(provider);
  });

  it('returns undefined for unregistered capability', () => {
    expect(registry.get('camera')).toBeUndefined();
  });

  it('has() returns correct state', () => {
    expect(registry.has('sms')).toBe(false);
    const provider: CapabilityProvider<'sms'> = {
      capability: 'sms',
      isAvailable: async () => true,
      initialize: async () => {},
      dispose: () => {},
    };
    registry.register('sms', provider);
    expect(registry.has('sms')).toBe(true);
  });

  it('can() checks registration', () => {
    expect(registry.can('bluetooth')).toBe(false);
    const provider: CapabilityProvider<'bluetooth'> = {
      capability: 'bluetooth',
      isAvailable: async () => true,
      initialize: async () => {},
      dispose: () => {},
    };
    registry.register('bluetooth', provider);
    expect(registry.can('bluetooth')).toBe(true);
  });

  it('getAvailable returns registered capabilities', () => {
    const p1: CapabilityProvider<'wifi'> = {
      capability: 'wifi',
      isAvailable: async () => true,
      initialize: async () => {},
      dispose: () => {},
    };
    const p2: CapabilityProvider<'location'> = {
      capability: 'location',
      isAvailable: async () => true,
      initialize: async () => {},
      dispose: () => {},
    };
    registry.register('wifi', p1);
    registry.register('location', p2);
    expect(registry.getAvailable()).toEqual(['wifi', 'location']);
  });

  it('detectPlatform returns web by default', () => {
    expect(registry.detectPlatform()).toBe('web');
  });
});
