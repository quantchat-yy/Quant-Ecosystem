import type { DeviceCapability, DevicePlatform, CapabilityProvider } from './capabilities/types.js';

export class CapabilityRegistry {
  private providers = new Map<DeviceCapability, CapabilityProvider>();

  register<T extends DeviceCapability>(capability: T, provider: CapabilityProvider<T>): void {
    this.providers.set(capability, provider);
  }

  get<T extends DeviceCapability>(capability: T): CapabilityProvider<T> | undefined {
    return this.providers.get(capability) as CapabilityProvider<T> | undefined;
  }

  has(capability: DeviceCapability): boolean {
    return this.providers.has(capability);
  }

  can(capability: DeviceCapability): boolean {
    return this.providers.has(capability);
  }

  getAvailable(): DeviceCapability[] {
    return [...this.providers.keys()];
  }

  detectPlatform(): DevicePlatform {
    return 'web';
  }
}
