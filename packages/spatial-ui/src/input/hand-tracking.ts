import type { HandGesture } from '../types.js';
const TYPES = new Set(['pinch', 'grab', 'point', 'swipe']);
const HANDS = new Set(['left', 'right']);
export class HandTracker {
  private listeners: Array<(g: HandGesture) => void> = [];
  private active = false;
  detect(rawInput: unknown): HandGesture | null {
    if (!rawInput || typeof rawInput !== 'object') return null;
    const inp = rawInput as Record<string, unknown>;
    if (typeof inp['type'] !== 'string' || !TYPES.has(inp['type'])) return null;
    if (typeof inp['confidence'] !== 'number') return null;
    if (inp['confidence'] < 0 || inp['confidence'] > 1) return null;
    if (typeof inp['hand'] !== 'string' || !HANDS.has(inp['hand'])) return null;
    // prettier-ignore
    const gesture: HandGesture = { type: inp['type'] as HandGesture['type'], confidence: inp['confidence'], hand: inp['hand'] as HandGesture['hand'] };
    if (this.active) this.listeners.forEach((cb) => cb(gesture));
    return gesture;
  }
  // prettier-ignore
  onGesture(cb: (g: HandGesture) => void): void { this.listeners.push(cb); }
  // prettier-ignore
  start(): void { this.active = true; }
  // prettier-ignore
  stop(): void { this.active = false; }
}
