import type { PhoneCapability } from '../capabilities/phone.js';

export class NativePhoneProvider implements PhoneCapability {
  readonly capability = 'phone' as const;
  private callCounter = 0;

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async initialize(): Promise<void> {
    // No-op
  }

  dispose(): void {
    // No-op
  }

  async placeCall(number: string): Promise<string> {
    // In a real environment this would open tel: URI via platform API
    void `tel:${number}`;
    return `native_call_${++this.callCounter}`;
  }

  async answerCall(_callId: string): Promise<void> {
    throw new Error('Not supported in native dialer mode');
  }

  async endCall(_callId: string): Promise<void> {
    throw new Error('Not supported in native dialer mode');
  }

  async holdCall(_callId: string): Promise<void> {
    throw new Error('Not supported in native dialer mode');
  }

  async transferCall(_callId: string, _target: string): Promise<void> {
    throw new Error('Not supported in native dialer mode');
  }
}
