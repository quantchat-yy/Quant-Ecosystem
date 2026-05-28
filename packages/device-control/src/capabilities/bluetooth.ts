import type { CapabilityProvider } from './types.js';

export interface BtDevice {
  id: string;
  name: string;
  rssi: number;
}

export interface BluetoothCapability extends CapabilityProvider<'bluetooth'> {
  scan(timeout?: number): Promise<BtDevice[]>;
  pair(deviceId: string): Promise<void>;
  connect(deviceId: string): Promise<void>;
  disconnect(deviceId: string): Promise<void>;
  listDevices(): Promise<BtDevice[]>;
}
