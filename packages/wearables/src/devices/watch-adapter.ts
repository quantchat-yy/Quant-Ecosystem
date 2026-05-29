import type { HealthMetrics } from '../types.js';

export type WatchProfile = 'pixel-watch' | 'apple-watch';

interface WatchProfileConfig {
  name: string;
  screenSize: number;
  hasECG: boolean;
  hasBloodOxygen: boolean;
}

const PROFILES: Record<WatchProfile, WatchProfileConfig> = {
  'pixel-watch': {
    name: 'Pixel Watch',
    screenSize: 41,
    hasECG: true,
    hasBloodOxygen: true,
  },
  'apple-watch': {
    name: 'Apple Watch',
    screenSize: 45,
    hasECG: true,
    hasBloodOxygen: true,
  },
};

export class WatchAdapter {
  private connected = false;
  private profile: WatchProfile = 'pixel-watch';
  private notifications: Array<{ id: string; title: string; body: string }> = [];

  setProfile(profile: WatchProfile): void {
    this.profile = profile;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.notifications = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  getHealthMetrics(): HealthMetrics | null {
    if (!this.connected) return null;
    return {
      heartRate: 72,
      steps: 5000,
      calories: 250,
      bloodOxygen: PROFILES[this.profile].hasBloodOxygen ? 98 : undefined,
    };
  }

  async sendNotification(notification: { id: string; title: string; body: string }): Promise<void> {
    this.notifications.push(notification);
  }

  getNotifications(): Array<{ id: string; title: string; body: string }> {
    return [...this.notifications];
  }

  async getInput(): Promise<string> {
    return 'tap';
  }
}
