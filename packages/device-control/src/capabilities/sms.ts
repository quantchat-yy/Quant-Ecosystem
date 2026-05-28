import type { CapabilityProvider } from './types.js';

export interface SmsMessage {
  id: string;
  from: string;
  body: string;
  timestamp: number;
}

export interface SMSCapability extends CapabilityProvider<'sms'> {
  sendSMS(to: string, body: string): Promise<string>;
  readSMS(id: string): Promise<SmsMessage>;
  onIncomingSMS(cb: (msg: SmsMessage) => void): () => void;
}
