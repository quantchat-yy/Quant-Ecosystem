import { describe, it, expect, beforeEach } from 'vitest';
import { PassthroughBridge } from '../ar-bridge/passthrough-bridge.js';
import type { ARPassthroughConfig, AnchoredObject } from '../types.js';

describe('PassthroughBridge', () => {
  let bridge: PassthroughBridge;

  const config: ARPassthroughConfig = {
    resolution: { width: 1920, height: 1080 },
    frameRate: 60,
    overlayMode: 'passthrough',
    anchoredObjects: [],
  };

  beforeEach(() => {
    bridge = new PassthroughBridge();
  });

  it('initializes with config', () => {
    bridge.initialize(config);
    expect(bridge.isInitialized()).toBe(true);
    expect(bridge.getConfig()).toEqual(config);
  });

  it('starts capture after initialization', async () => {
    bridge.initialize(config);
    const started = await bridge.startCapture();
    expect(started).toBe(true);
    expect(bridge.isCapturing()).toBe(true);
  });

  it('fails to start capture without initialization', async () => {
    const started = await bridge.startCapture();
    expect(started).toBe(false);
  });

  it('stops capture', async () => {
    bridge.initialize(config);
    await bridge.startCapture();
    await bridge.stopCapture();
    expect(bridge.isCapturing()).toBe(false);
  });

  it('adds and removes overlays', () => {
    bridge.initialize(config);
    const overlay: AnchoredObject = {
      id: 'obj-1',
      type: 'label',
      position: { x: 1, y: 2, z: 3 },
      scale: 1,
    };
    bridge.addOverlay(overlay);
    expect(bridge.getOverlays()).toHaveLength(1);
    expect(bridge.removeOverlay('obj-1')).toBe(true);
    expect(bridge.getOverlays()).toHaveLength(0);
  });

  it('gets a frame when capturing', async () => {
    bridge.initialize(config);
    await bridge.startCapture();
    const frame = bridge.getFrame();
    expect(frame).not.toBeNull();
    expect(frame!.resolution).toEqual({ width: 1920, height: 1080 });
  });

  it('returns null frame when not capturing', () => {
    bridge.initialize(config);
    expect(bridge.getFrame()).toBeNull();
  });
});
