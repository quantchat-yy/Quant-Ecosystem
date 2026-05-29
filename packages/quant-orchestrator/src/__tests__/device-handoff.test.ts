import { describe, it, expect } from 'vitest';
import { DeviceHandoff } from '../device-handoff.js';
import type { QueuedAction, SessionContext } from '../types.js';

function createMockContext(): SessionContext {
  return {
    userId: 'user_001',
    deviceId: 'device_001',
    deviceType: 'phone',
    currentApp: null,
    currentScreen: null,
    ambientContext: 'home',
    phoneFreeMode: false,
    voiceActive: true,
  };
}

describe('DeviceHandoff - extended', () => {
  it('should set first registered device as active', () => {
    const handoff = new DeviceHandoff();
    expect(handoff.getActiveDevice()).toBeNull();
    handoff.registerDevice('phone_1', 'phone');
    expect(handoff.getActiveDevice()).toBe('phone_1');
  });

  it('should return null from getActiveDevice when no devices registered', () => {
    const handoff = new DeviceHandoff();
    expect(handoff.getActiveDevice()).toBeNull();
  });

  it('should change active device with setActiveDevice', () => {
    const handoff = new DeviceHandoff();
    handoff.registerDevice('phone_1', 'phone');
    handoff.registerDevice('desktop_1', 'desktop');
    expect(handoff.getActiveDevice()).toBe('phone_1');

    handoff.setActiveDevice('desktop_1');
    expect(handoff.getActiveDevice()).toBe('desktop_1');
  });

  it('should throw when setActiveDevice is called with unregistered device', () => {
    const handoff = new DeviceHandoff();
    handoff.registerDevice('phone_1', 'phone');
    expect(() => handoff.setActiveDevice('nonexistent')).toThrow('Device not registered');
  });

  it('should preserve pending actions in handoffWithActions', () => {
    const handoff = new DeviceHandoff();
    handoff.registerDevice('phone_1', 'phone');
    handoff.registerDevice('watch_1', 'watch');

    const actions: QueuedAction[] = [
      {
        id: 'q1',
        intent: { type: 'tool', confidence: 0.9, rawTranscript: 'send email', toolId: 'send' },
        enqueuedAt: Date.now(),
      },
      {
        id: 'q2',
        intent: { type: 'tool', confidence: 0.7, rawTranscript: 'check inbox', toolId: 'check' },
        enqueuedAt: Date.now(),
      },
    ];

    const state = handoff.handoffWithActions('phone_1', 'watch_1', createMockContext(), actions);
    expect(state.pendingActions).toHaveLength(2);
    expect(state.pendingActions[0]!.id).toBe('q1');
    expect(state.pendingActions[1]!.id).toBe('q2');
  });

  it('should return all registered device IDs from listDevices', () => {
    const handoff = new DeviceHandoff();
    handoff.registerDevice('phone_1', 'phone');
    handoff.registerDevice('tablet_1', 'tablet');
    handoff.registerDevice('glasses_1', 'glasses');

    const devices = handoff.listDevices();
    expect(devices).toHaveLength(3);
    expect(devices).toContain('phone_1');
    expect(devices).toContain('tablet_1');
    expect(devices).toContain('glasses_1');
  });
});
