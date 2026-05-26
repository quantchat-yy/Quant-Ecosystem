import { describe, it, expect } from 'vitest';
import { ScreenCapture } from '../../device/screen-capture.js';

describe('ScreenCapture', () => {
  it('captures a frame', async () => {
    const capture = new ScreenCapture();
    const frame = await capture.capture(100, 100);
    expect(frame.id).toContain('frame-');
    expect(frame.width).toBe(100);
    expect(frame.height).toBe(100);
    expect(frame.data.length).toBe(100 * 100 * 4);
  });

  it('stores frames in buffer', async () => {
    const capture = new ScreenCapture(3);
    await capture.capture(10, 10);
    await capture.capture(10, 10);
    await capture.capture(10, 10);
    expect(capture.getFrameBuffer()).toHaveLength(3);

    await capture.capture(10, 10);
    expect(capture.getFrameBuffer()).toHaveLength(3);
  });

  it('gets last frame', async () => {
    const capture = new ScreenCapture();
    expect(capture.getLastFrame()).toBeNull();

    await capture.capture(10, 10);
    const last = capture.getLastFrame();
    expect(last).not.toBeNull();
    expect(last!.id).toContain('frame-');
  });

  it('computes diff between identical frames', async () => {
    const capture = new ScreenCapture();
    const frame1 = await capture.capture(10, 10);
    const frame2 = await capture.capture(10, 10);

    const diff = capture.getDiff(frame1, frame2);
    expect(diff.changed).toBe(false);
    expect(diff.changePercentage).toBe(0);
    expect(diff.changedRegions).toHaveLength(0);
  });

  it('computes diff between different frames', async () => {
    const capture = new ScreenCapture();
    const frame1 = await capture.capture(10, 10);
    const frame2 = await capture.capture(10, 10);
    // Modify frame2 data
    frame2.data[0] = 255;

    const diff = capture.getDiff(frame1, frame2);
    expect(diff.changed).toBe(true);
    expect(diff.changePercentage).toBeGreaterThan(0);
    expect(diff.changedRegions.length).toBeGreaterThan(0);
  });

  it('extracts region from frame', async () => {
    const capture = new ScreenCapture();
    const frame = await capture.capture(100, 100);
    const region = capture.getRegion(frame, { x: 10, y: 10, width: 20, height: 20 });
    expect(region.length).toBe(20 * 20 * 4);
  });

  it('clears buffer', async () => {
    const capture = new ScreenCapture();
    await capture.capture(10, 10);
    await capture.capture(10, 10);
    capture.clearBuffer();
    expect(capture.getFrameBuffer()).toHaveLength(0);
  });
});
