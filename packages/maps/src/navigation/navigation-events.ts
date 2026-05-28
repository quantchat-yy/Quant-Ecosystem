import { type NavigationEventType } from '../types.js';

type Callback = (payload?: unknown) => void;

export class NavigationEventEmitter {
  private listeners = new Map<NavigationEventType, Set<Callback>>();

  on(event: NavigationEventType, callback: Callback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: NavigationEventType, callback: Callback): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: NavigationEventType, payload?: unknown): void {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(payload);
      } catch {
        // Isolate listener errors to prevent breaking other listeners
      }
    });
  }
}
