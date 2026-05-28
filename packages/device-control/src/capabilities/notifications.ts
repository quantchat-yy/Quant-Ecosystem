import type { CapabilityProvider } from './types.js';

export interface DeviceNotification {
  id: string;
  title: string;
  body: string;
  app: string;
  timestamp: number;
}

export interface NotificationsCapability extends CapabilityProvider<'notifications'> {
  list(): Promise<DeviceNotification[]>;
  dismiss(id: string): Promise<void>;
  snooze(id: string, durationMs: number): Promise<void>;
  reply(id: string, text: string): Promise<void>;
  onNew(cb: (n: DeviceNotification) => void): () => void;
}
