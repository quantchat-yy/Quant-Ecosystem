import type { WearableDevice, WearableDeviceType } from '../types.js';

export class DeviceRegistry {
  private devices: Map<string, WearableDevice> = new Map();

  register(device: WearableDevice): void {
    this.devices.set(device.id, device);
  }

  unregister(deviceId: string): boolean {
    return this.devices.delete(deviceId);
  }

  get(deviceId: string): WearableDevice | undefined {
    return this.devices.get(deviceId);
  }

  getConnected(): WearableDevice[] {
    return Array.from(this.devices.values()).filter((d) => d.connectionStatus === 'connected');
  }

  getByType(type: WearableDeviceType): WearableDevice[] {
    return Array.from(this.devices.values()).filter((d) => d.type === type);
  }

  getCapabilities(deviceId: string): string[] {
    const device = this.devices.get(deviceId);
    return device ? device.capabilities : [];
  }

  getAll(): WearableDevice[] {
    return Array.from(this.devices.values());
  }
}
