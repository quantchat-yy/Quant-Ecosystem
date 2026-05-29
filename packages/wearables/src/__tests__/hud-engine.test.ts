import { describe, it, expect, beforeEach } from 'vitest';
import { HUDEngine } from '../hud/hud-engine.js';
import type { HUDElement } from '../types.js';

describe('HUDEngine', () => {
  let engine: HUDEngine;

  const notification: HUDElement = {
    id: 'notif-1',
    type: 'notification',
    position: { x: 0, y: 0.9 },
    content: 'New message',
    priority: 5,
    ttl: 3000,
  };

  const nav: HUDElement = {
    id: 'nav-1',
    type: 'navigation',
    position: { x: 0.5, y: 0.5 },
    content: 'Turn left in 200m',
    priority: 8,
  };

  beforeEach(() => {
    engine = new HUDEngine();
  });

  it('renders multiple elements', () => {
    engine.render([notification, nav]);
    expect(engine.getActiveElements()).toHaveLength(2);
  });

  it('adds a single element', () => {
    engine.addElement(notification);
    expect(engine.getElementById('notif-1')).toEqual(notification);
  });

  it('removes an element', () => {
    engine.addElement(notification);
    expect(engine.removeElement('notif-1')).toBe(true);
    expect(engine.getElementById('notif-1')).toBeUndefined();
  });

  it('returns false removing nonexistent element', () => {
    expect(engine.removeElement('fake')).toBe(false);
  });

  it('clears all elements', () => {
    engine.render([notification, nav]);
    engine.clear();
    expect(engine.getActiveElements()).toHaveLength(0);
  });

  it('sets and gets layout', () => {
    engine.setLayout('center');
    expect(engine.getLayout()).toBe('center');
  });

  it('returns elements sorted by priority descending', () => {
    engine.render([notification, nav]);
    const active = engine.getActiveElements();
    expect(active[0]!.id).toBe('nav-1');
    expect(active[1]!.id).toBe('notif-1');
  });
});
