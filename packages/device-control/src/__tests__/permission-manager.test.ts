import { describe, it, expect, beforeEach } from 'vitest';
import { PermissionManager } from '../permissions/permission-manager.js';
import { CAPABILITY_TIER_MAP } from '../permissions/permission-types.js';

describe('PermissionManager', () => {
  let pm: PermissionManager;

  beforeEach(() => {
    pm = new PermissionManager();
  });

  it('defaults to prompt state', () => {
    expect(pm.getState('camera')).toBe('prompt');
  });

  it('sets and gets state', () => {
    pm.setState('phone', 'denied');
    expect(pm.getState('phone')).toBe('denied');
  });

  it('getTier maps capabilities correctly', () => {
    expect(pm.getTier('accessibility')).toBe(4);
    expect(pm.getTier('sensors')).toBe(1);
    expect(pm.getTier('phone')).toBe(3);
    expect(pm.getTier('contacts')).toBe(2);
  });

  it('tier map covers all capabilities', () => {
    const caps = Object.keys(CAPABILITY_TIER_MAP);
    expect(caps.length).toBe(11);
    for (const tier of Object.values(CAPABILITY_TIER_MAP)) {
      expect(tier).toBeGreaterThanOrEqual(0);
      expect(tier).toBeLessThanOrEqual(4);
    }
  });

  it('request grants permission from prompt state', async () => {
    const result = await pm.request('location');
    expect(result).toBe('granted');
    expect(pm.getState('location')).toBe('granted');
  });

  it('request returns existing denied state', async () => {
    pm.setState('files', 'denied');
    const result = await pm.request('files');
    expect(result).toBe('denied');
  });
});
