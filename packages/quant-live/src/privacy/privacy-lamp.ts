import type { PrivacyInputSource, PrivacyLampState } from '../types.js';

type StateChangeCallback = (state: PrivacyLampState) => void;
type Unsubscribe = () => void;

export class PrivacyLampController {
  private sources = new Map<string, PrivacyInputSource>();
  private callbacks: StateChangeCallback[] = [];
  private localCount = 0;
  private transmittedCount = 0;

  registerSource(type: PrivacyInputSource['type'], active = false): void {
    const prev = this.getState();
    this.sources.set(type, { type, active, startedAt: active ? Date.now() : null });
    this.notifyIfChanged(prev);
  }

  unregisterSource(type: PrivacyInputSource['type']): void {
    const prev = this.getState();
    this.sources.delete(type);
    this.notifyIfChanged(prev);
  }

  activate(type: PrivacyInputSource['type']): void {
    const prev = this.getState();
    const source = this.sources.get(type);
    if (source) {
      source.active = true;
      source.startedAt = Date.now();
    }
    this.notifyIfChanged(prev);
  }

  deactivate(type: PrivacyInputSource['type']): void {
    const prev = this.getState();
    const source = this.sources.get(type);
    if (source) {
      source.active = false;
      source.startedAt = null;
    }
    this.notifyIfChanged(prev);
  }

  getState(): PrivacyLampState {
    for (const source of this.sources.values()) {
      if (source.active && (source.type === 'camera' || source.type === 'screen')) {
        return 'recording';
      }
    }
    for (const source of this.sources.values()) {
      if (source.active && source.type === 'mic') {
        return 'active-listening';
      }
    }
    for (const source of this.sources.values()) {
      if (source.active && source.type === 'wake-word') {
        return 'wake-listening';
      }
    }
    return 'dormant';
  }

  getSources(): PrivacyInputSource[] {
    return [...this.sources.values()];
  }

  onStateChange(cb: StateChangeCallback): Unsubscribe {
    this.callbacks.push(cb);
    return () => {
      const idx = this.callbacks.indexOf(cb);
      if (idx >= 0) this.callbacks.splice(idx, 1);
    };
  }

  getTransmissionLog(): { local: number; transmitted: number } {
    return { local: this.localCount, transmitted: this.transmittedCount };
  }

  recordLocal(): void {
    this.localCount++;
  }

  recordTransmitted(): void {
    this.transmittedCount++;
  }

  private notifyIfChanged(prev: PrivacyLampState): void {
    const current = this.getState();
    if (current !== prev) {
      for (const cb of this.callbacks) cb(current);
    }
  }
}
