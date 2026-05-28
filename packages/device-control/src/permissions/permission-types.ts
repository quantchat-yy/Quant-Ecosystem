import type { DeviceCapability } from '../capabilities/types.js';

export type DevicePermissionState = 'granted' | 'denied' | 'prompt' | 'unavailable';

export const CAPABILITY_TIER_MAP: Record<DeviceCapability, number> = {
  phone: 3,
  sms: 3,
  contacts: 2,
  camera: 2,
  location: 2,
  sensors: 1,
  bluetooth: 2,
  wifi: 1,
  files: 3,
  notifications: 1,
  accessibility: 4,
};
