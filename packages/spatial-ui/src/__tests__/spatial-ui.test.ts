import { XRSessionManager } from '../xr/xr-session.js';
import { SpatialPanelManager } from '../panels/spatial-panel.js';
import { HandTracker } from '../input/hand-tracking.js';
describe('XRSessionManager', () => {
  it('start/end sessions and device caps', () => {
    const m = new XRSessionManager();
    const id = m.startSession({ mode: 'immersive-vr', features: ['hand-tracking'] });
    expect(id).toMatch(/^xr-/);
    expect(m.endSession(id)).toBe(true);
    expect(m.endSession(id)).toBe(false);
    expect(m.getDeviceCaps('default')!.type).toBe('generic');
    expect(m.getDeviceCaps('x')).toBeNull();
  });
});
describe('SpatialPanelManager', () => {
  it('create, move, resize, anchor, remove', () => {
    const m = new SpatialPanelManager();
    // prettier-ignore
    const p = m.createPanel({ position: { x: 0, y: 1, z: -2 }, size: { w: 100, h: 80 }, anchor: 'room' });
    expect(p.id).toMatch(/^panel-/);
    expect(m.movePanel(p.id, { x: 1, y: 2, z: 3 })).toBe(true);
    expect(m.movePanel('x', { x: 0, y: 0, z: 0 })).toBe(false);
    expect(m.resizePanel(p.id, { w: 200, h: 150 })).toBe(true);
    expect(m.anchorPanel(p.id, 'hand')).toBe(true);
    expect(m.removePanel(p.id)).toBe(true);
    expect(m.removePanel(p.id)).toBe(false);
  });
});
describe('HandTracker', () => {
  it('validates gestures and fires callbacks only when active', () => {
    const t = new HandTracker();
    expect(t.detect({ type: 'pinch', confidence: 0.9, hand: 'right' })!.type).toBe('pinch');
    expect(t.detect(null)).toBeNull();
    expect(t.detect({})).toBeNull();
    expect(t.detect({ type: 'bad', confidence: 0.5, hand: 'left' })).toBeNull();
    expect(t.detect({ type: 'pinch', confidence: 2, hand: 'left' })).toBeNull();
    const gs: unknown[] = [];
    t.onGesture((g) => gs.push(g));
    t.start();
    t.detect({ type: 'grab', confidence: 0.8, hand: 'left' });
    expect(gs).toHaveLength(1);
    t.stop();
    t.detect({ type: 'swipe', confidence: 0.9, hand: 'left' });
    expect(gs).toHaveLength(1);
  });
});
