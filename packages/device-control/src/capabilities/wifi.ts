import type { CapabilityProvider } from './types.js';

export interface WifiNetwork {
  ssid: string;
  signal: number;
  secure: boolean;
}

export interface WiFiCapability extends CapabilityProvider<'wifi'> {
  listNetworks(): Promise<WifiNetwork[]>;
  connect(ssid: string, password?: string): Promise<void>;
  disconnect(): Promise<void>;
  getCurrentNetwork(): Promise<WifiNetwork | null>;
}
