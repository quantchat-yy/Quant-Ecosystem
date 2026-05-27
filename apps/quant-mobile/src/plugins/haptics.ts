// Haptics Service - Haptic feedback abstraction

export type HapticStyle = 'light' | 'medium' | 'heavy';

export interface ImpactOptions {
  style: HapticStyle;
}

export type NotificationType = 'success' | 'warning' | 'error';

export interface NotificationOptions {
  type: NotificationType;
}

export class HapticsService {
  private lastAction: { type: string; timestamp: number } | null = null;
  private selectionActive = false;

  async impact(style: HapticStyle): Promise<void> {
    if (!['light', 'medium', 'heavy'].includes(style)) {
      throw new Error(`Invalid haptic style: ${style}`);
    }
    this.lastAction = { type: `impact:${style}`, timestamp: Date.now() };
  }

  async notification(type: NotificationType): Promise<void> {
    if (!['success', 'warning', 'error'].includes(type)) {
      throw new Error(`Invalid notification type: ${type}`);
    }
    this.lastAction = { type: `notification:${type}`, timestamp: Date.now() };
  }

  async vibrate(duration: number): Promise<void> {
    if (duration <= 0) {
      throw new Error('Duration must be positive');
    }
    this.lastAction = { type: `vibrate:${duration}`, timestamp: Date.now() };
  }

  selectionStart(): void {
    this.selectionActive = true;
    this.lastAction = { type: 'selectionStart', timestamp: Date.now() };
  }

  selectionChanged(): void {
    if (!this.selectionActive) {
      return;
    }
    this.lastAction = { type: 'selectionChanged', timestamp: Date.now() };
  }

  selectionEnd(): void {
    this.selectionActive = false;
    this.lastAction = { type: 'selectionEnd', timestamp: Date.now() };
  }

  /** @internal - for testing */
  _getLastAction(): { type: string; timestamp: number } | null {
    return this.lastAction;
  }

  /** @internal - for testing */
  _isSelectionActive(): boolean {
    return this.selectionActive;
  }
}
