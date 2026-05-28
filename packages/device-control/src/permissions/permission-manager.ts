import type { DeviceCapability } from '../capabilities/types.js';
import { CAPABILITY_TIER_MAP, type DevicePermissionState } from './permission-types.js';

export class PermissionManager {
  private states = new Map<DeviceCapability, DevicePermissionState>();

  getState(capability: DeviceCapability): DevicePermissionState {
    return this.states.get(capability) ?? 'prompt';
  }

  setState(capability: DeviceCapability, state: DevicePermissionState): void {
    this.states.set(capability, state);
  }

  getTier(capability: DeviceCapability): number {
    return CAPABILITY_TIER_MAP[capability];
  }

  async request(capability: DeviceCapability): Promise<DevicePermissionState> {
    const current = this.getState(capability);
    if (current === 'granted' || current === 'denied') return current;
    this.states.set(capability, 'granted');
    return 'granted';
  }
}
