import { describe, it, expect, vi } from 'vitest';
import { PrivacyLampController } from '../privacy/privacy-lamp.js';

describe('PrivacyLampController', () => {
  it('initial state is dormant with no sources', () => {
    const lamp = new PrivacyLampController();
    expect(lamp.getState()).toBe('dormant');
    expect(lamp.getSources()).toEqual([]);
  });

  it('registering and activating wake-word source gives wake-listening state', () => {
    const lamp = new PrivacyLampController();
    lamp.registerSource('wake-word', true);
    expect(lamp.getState()).toBe('wake-listening');
  });

  it('activating mic source gives active-listening state', () => {
    const lamp = new PrivacyLampController();
    lamp.registerSource('mic');
    lamp.activate('mic');
    expect(lamp.getState()).toBe('active-listening');
  });

  it('activating camera source gives recording state', () => {
    const lamp = new PrivacyLampController();
    lamp.registerSource('camera');
    lamp.activate('camera');
    expect(lamp.getState()).toBe('recording');
  });

  it('activating screen source gives recording state', () => {
    const lamp = new PrivacyLampController();
    lamp.registerSource('screen');
    lamp.activate('screen');
    expect(lamp.getState()).toBe('recording');
  });

  it('deactivating all sources returns to dormant', () => {
    const lamp = new PrivacyLampController();
    lamp.registerSource('mic', true);
    expect(lamp.getState()).toBe('active-listening');
    lamp.deactivate('mic');
    expect(lamp.getState()).toBe('dormant');
  });

  it('onStateChange callback fires on transitions', () => {
    const lamp = new PrivacyLampController();
    const handler = vi.fn();
    lamp.onStateChange(handler);
    lamp.registerSource('mic', true);
    expect(handler).toHaveBeenCalledWith('active-listening');
  });

  it('has no disable or hide methods', () => {
    const lamp = new PrivacyLampController();
    expect((lamp as unknown as Record<string, unknown>)['disable']).toBeUndefined();
    expect((lamp as unknown as Record<string, unknown>)['hide']).toBeUndefined();
    expect((lamp as unknown as Record<string, unknown>)['suppress']).toBeUndefined();
  });

  it('tracks local and transmitted counts', () => {
    const lamp = new PrivacyLampController();
    lamp.recordLocal();
    lamp.recordLocal();
    lamp.recordTransmitted();
    expect(lamp.getTransmissionLog()).toEqual({ local: 2, transmitted: 1 });
  });

  it('unsubscribes state change callback', () => {
    const lamp = new PrivacyLampController();
    const handler = vi.fn();
    const unsub = lamp.onStateChange(handler);
    unsub();
    lamp.registerSource('mic', true);
    expect(handler).not.toHaveBeenCalled();
  });
});
