import { describe, it, expect, beforeEach } from 'vitest';
import { DeviceRegistry } from '../devices/device-registry.js';
import type { WearableDevice } from '../types.js';

describe('DeviceRegistry', () => {
  let registry: DeviceRegistry;

  const glasses: WearableDevice = {
    id: 'glasses-1',
    type: 'glasses',
    name: 'Meta Ray-Ban',
    capabilities: ['camera', 'display', 'audio'],
    connectionStatus: 'connected',
  };

  const watch: WearableDevice = {
    id: 'watch-1',
    type: 'watch',
    name: 'Pixel Watch',
    capabilities: ['health', 'notifications', 'haptic'],
    connectionStatus: 'connected',
  };

  const headset: WearableDevice = {
    id: 'headset-1',
    type: 'headset',
    name: 'Quest 3',
    capabilities: ['tracking', 'display', 'audio', 'passthrough'],
    connectionStatus: 'disconnected',
  };

  beforeEach(() => {
    registry = new DeviceRegistry();
  });

  it('registers a device', () => {
    registry.register(glasses);
    expect(registry.get('glasses-1')).toEqual(glasses);
  });

  it('unregisters a device', () => {
    registry.register(glasses);
    expect(registry.unregister('glasses-1')).toBe(true);
    expect(registry.get('glasses-1')).toBeUndefined();
  });

  it('returns false for unregistering unknown device', () => {
    expect(registry.unregister('unknown')).toBe(false);
  });

  it('gets connected devices only', () => {
    registry.register(glasses);
    registry.register(watch);
    registry.register(headset);
    const connected = registry.getConnected();
    expect(connected).toHaveLength(2);
    expect(connected.map((d) => d.id)).toContain('glasses-1');
    expect(connected.map((d) => d.id)).toContain('watch-1');
  });

  it('gets devices by type', () => {
    registry.register(glasses);
    registry.register(watch);
    registry.register(headset);
    const watches = registry.getByType('watch');
    expect(watches).toHaveLength(1);
    expect(watches[0]!.id).toBe('watch-1');
  });

  it('gets capabilities for a device', () => {
    registry.register(headset);
    const caps: string[] = registry.getCapabilities('headset-1');
    expect(caps).toEqual(['tracking', 'display', 'audio', 'passthrough']);
  });

  it('returns empty array for unknown device capabilities', () => {
    expect(registry.getCapabilities('nonexistent')).toEqual([]);
  });
});
