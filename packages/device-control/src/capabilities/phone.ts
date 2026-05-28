import type { CapabilityProvider } from './types.js';

export interface PhoneCapability extends CapabilityProvider<'phone'> {
  placeCall(number: string): Promise<string>;
  answerCall(callId: string): Promise<void>;
  endCall(callId: string): Promise<void>;
  holdCall(callId: string): Promise<void>;
  transferCall(callId: string, target: string): Promise<void>;
}
