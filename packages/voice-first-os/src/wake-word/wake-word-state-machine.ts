import type { WakeWordState, WakeWordTransition } from '../types.js';

export class WakeWordStateMachine {
  private state: WakeWordState = 'idle';
  private confidenceThreshold = 0.7;
  private cooldownMs = 2000;
  private timeoutMs = 10000;
  private lastTransition = 0;
  private history: WakeWordTransition[] = [];
  private falsePositiveTimestamps: number[] = [];
  private falsePositiveWindow = 60000;
  private maxFalsePositives = 3;
  private recentActivations: number[] = [];

  getState(): WakeWordState {
    return this.state;
  }

  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = threshold;
  }

  setCooldownMs(ms: number): void {
    this.cooldownMs = ms;
  }

  setTimeoutMs(ms: number): void {
    this.timeoutMs = ms;
  }

  trigger(confidence: number): boolean {
    const now = Date.now();

    // Suppress if too many false positives within the window
    this.recentActivations = this.recentActivations.filter(
      (t) => now - t < this.falsePositiveWindow,
    );
    this.falsePositiveTimestamps = this.falsePositiveTimestamps.filter(
      (t) => now - t < this.falsePositiveWindow,
    );
    if (
      this.falsePositiveTimestamps.length >= this.maxFalsePositives &&
      this.recentActivations.length >= this.maxFalsePositives
    ) {
      return false;
    }

    if (this.state === 'cooldown') {
      if (now - this.lastTransition < this.cooldownMs) return false;
      this.transition('idle', confidence);
    }

    if (this.state === 'idle' && confidence >= this.confidenceThreshold) {
      this.transition('listening', confidence);
      return true;
    }
    return false;
  }

  confirm(confidence: number): boolean {
    if (this.state !== 'listening') return false;
    if (confidence >= this.confidenceThreshold) {
      this.transition('confirming', confidence);
      this.transition('active', confidence);
      this.recentActivations.push(Date.now());
      return true;
    }
    return false;
  }

  markFalsePositive(): void {
    this.falsePositiveTimestamps.push(Date.now());
    this.transition('cooldown', 0);
  }

  deactivate(): void {
    if (this.state === 'active' || this.state === 'listening' || this.state === 'confirming') {
      this.transition('cooldown', 0);
    }
  }

  checkTimeout(): boolean {
    if (this.state === 'active' || this.state === 'listening') {
      if (Date.now() - this.lastTransition >= this.timeoutMs) {
        this.transition('idle', 0);
        return true;
      }
    }
    return false;
  }

  getHistory(): WakeWordTransition[] {
    return [...this.history];
  }

  getActivationCount(): number {
    return this.history.filter((h) => h.to === 'active').length;
  }

  private transition(to: WakeWordState, confidence: number): void {
    const from = this.state;
    this.state = to;
    this.lastTransition = Date.now();
    this.history.push({ from, to, confidence, timestamp: this.lastTransition });
  }
}
