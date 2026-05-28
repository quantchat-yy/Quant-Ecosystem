import type { PhoneCapability } from '../capabilities/phone.js';
import { CallSessionManager } from './call-session.js';
import type { TwilioConfig } from './types.js';

export interface TwilioClientLike {
  calls: {
    create(opts: { to: string; from: string; url: string }): Promise<{ sid: string }>;
  } & ((sid: string) => { update(opts: { status: string }): Promise<void> });
  conferences: {
    create(opts: { friendlyName: string }): Promise<unknown>;
  };
}

export class TwilioPhoneProvider implements PhoneCapability {
  readonly capability = 'phone' as const;
  private liveMode: boolean;
  private twilioClient: TwilioClientLike | null;
  private config: TwilioConfig | null;
  private sessionManager = new CallSessionManager();
  private callCounter = 0;

  constructor(config?: TwilioConfig, client?: TwilioClientLike) {
    const accountSid = config?.accountSid ?? process.env['TWILIO_ACCOUNT_SID'];
    // NOTE: authToken is sensitive and should never be logged or serialized.
    const authToken = config?.authToken ?? process.env['TWILIO_AUTH_TOKEN'];
    const fromNumber = config?.fromNumber ?? process.env['TWILIO_FROM_NUMBER'];

    if (accountSid && authToken && fromNumber) {
      this.liveMode = true;
      this.config = {
        accountSid,
        authToken,
        fromNumber,
        statusCallbackUrl: config?.statusCallbackUrl,
      };
      this.twilioClient = client ?? null;
    } else {
      this.liveMode = false;
      this.config = null;
      this.twilioClient = null;
    }
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async initialize(): Promise<void> {
    if (this.liveMode && !this.twilioClient && this.config) {
      const { default: Twilio } = await import('twilio');
      this.twilioClient = (Twilio as unknown as (sid: string, token: string) => TwilioClientLike)(
        this.config.accountSid,
        this.config.authToken,
      );
    }
  }

  dispose(): void {
    for (const session of this.sessionManager.getActive()) {
      this.sessionManager.end(session.callSid);
    }
  }

  async placeCall(number: string): Promise<string> {
    if (this.liveMode && this.twilioClient && this.config) {
      const call = await this.twilioClient.calls.create({
        to: number,
        from: this.config.fromNumber,
        url: this.config.statusCallbackUrl ?? 'http://demo.twilio.com/docs/voice.xml',
      });
      const session = this.sessionManager.create(
        call.sid,
        this.config.fromNumber,
        number,
        'outbound',
      );
      this.sessionManager.transition(session.callSid, 'dialing');
      return call.sid;
    }

    // Mock mode
    const callSid = `CA_mock_${++this.callCounter}`;
    const session = this.sessionManager.create(callSid, 'mock-from', number, 'outbound');
    this.sessionManager.transition(session.callSid, 'dialing');
    this.sessionManager.transition(session.callSid, 'ringing');
    return callSid;
  }

  async answerCall(callId: string): Promise<void> {
    this.sessionManager.transition(callId, 'connected');
  }

  async endCall(callId: string): Promise<void> {
    if (this.liveMode && this.twilioClient) {
      await this.twilioClient.calls(callId).update({ status: 'completed' });
    }
    this.sessionManager.end(callId);
  }

  async holdCall(callId: string): Promise<void> {
    this.sessionManager.transition(callId, 'on-hold');
  }

  async transferCall(callId: string, target: string): Promise<void> {
    if (this.liveMode && this.twilioClient) {
      await this.twilioClient.conferences.create({ friendlyName: `transfer-${callId}-${target}` });
    }
    this.sessionManager.end(callId);
  }

  getSessionManager(): CallSessionManager {
    return this.sessionManager;
  }
}
