export type DeviceCapability =
  | 'phone'
  | 'sms'
  | 'contacts'
  | 'camera'
  | 'location'
  | 'sensors'
  | 'bluetooth'
  | 'wifi'
  | 'files'
  | 'notifications'
  | 'accessibility';

export type DevicePlatform = 'web' | 'android' | 'ios';

export interface CapabilityProvider<T extends DeviceCapability = DeviceCapability> {
  readonly capability: T;
  isAvailable(): Promise<boolean>;
  initialize(): Promise<void>;
  dispose(): void;
}
