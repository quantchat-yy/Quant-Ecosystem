import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TwilioPhoneProvider, type TwilioClientLike } from '../providers/twilio-phone-provider.js';

function createMockTwilioClient(): TwilioClientLike {
  const mockUpdate = vi.fn().mockResolvedValue(undefined);
  const mockCallsCreate = vi.fn().mockResolvedValue({ sid: 'CA_live_123' });
  const mockConferencesCreate = vi.fn().mockResolvedValue({});

  const callsFn = ((_sid: string) => ({
    update: mockUpdate,
  })) as unknown as TwilioClientLike['calls'];
  callsFn.create = mockCallsCreate;

  return {
    calls: callsFn,
    conferences: { create: mockConferencesCreate },
  };
}

describe('TwilioPhoneProvider', () => {
  describe('mock mode (no credentials)', () => {
    let provider: TwilioPhoneProvider;

    beforeEach(() => {
      delete process.env['TWILIO_ACCOUNT_SID'];
      delete process.env['TWILIO_AUTH_TOKEN'];
      delete process.env['TWILIO_FROM_NUMBER'];
      provider = new TwilioPhoneProvider();
    });

    it('isAvailable returns true', async () => {
      expect(await provider.isAvailable()).toBe(true);
    });

    it('placeCall returns a mock callSid', async () => {
      const sid = await provider.placeCall('+15551234567');
      expect(sid).toMatch(/^CA_mock_/);
    });

    it('endCall transitions session to ended', async () => {
      const sid = await provider.placeCall('+15551234567');
      await provider.endCall(sid);
      const session = provider.getSessionManager().get(sid);
      expect(session?.status).toBe('ended');
    });

    it('holdCall transitions session to on-hold', async () => {
      const sid = await provider.placeCall('+15551234567');
      await provider.answerCall(sid);
      await provider.holdCall(sid);
      const session = provider.getSessionManager().get(sid);
      expect(session?.status).toBe('on-hold');
    });

    it('dispose ends all active sessions', async () => {
      await provider.placeCall('+1111');
      await provider.placeCall('+2222');
      provider.dispose();
      const active = provider.getSessionManager().getActive();
      expect(active).toHaveLength(0);
    });
  });

  describe('live mode (with credentials)', () => {
    let provider: TwilioPhoneProvider;
    let mockClient: TwilioClientLike;

    beforeEach(() => {
      mockClient = createMockTwilioClient();
      provider = new TwilioPhoneProvider(
        {
          accountSid: 'ACtest123',
          authToken: 'authtest',
          fromNumber: '+15550000000',
          statusCallbackUrl: 'http://example.com/status',
        },
        mockClient,
      );
    });

    it('placeCall uses twilio client', async () => {
      const sid = await provider.placeCall('+15559999999');
      expect(sid).toBe('CA_live_123');
      expect(mockClient.calls.create).toHaveBeenCalledWith({
        to: '+15559999999',
        from: '+15550000000',
        url: 'http://example.com/status',
      });
    });

    it('endCall updates call status via client', async () => {
      const sid = await provider.placeCall('+15559999999');
      await provider.endCall(sid);
      const session = provider.getSessionManager().get(sid);
      expect(session?.status).toBe('ended');
    });
  });
});
