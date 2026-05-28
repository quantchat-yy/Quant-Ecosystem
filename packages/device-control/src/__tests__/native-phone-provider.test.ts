import { describe, it, expect } from 'vitest';
import { NativePhoneProvider } from '../providers/native-phone-provider.js';

describe('NativePhoneProvider', () => {
  it('placeCall returns a unique call ID', async () => {
    const provider = new NativePhoneProvider();
    const id = await provider.placeCall('+15551234567');
    expect(id).toMatch(/^native_call_\d+$/);
  });

  it('placeCall increments call counter', async () => {
    const provider = new NativePhoneProvider();
    const id1 = await provider.placeCall('+1111');
    const id2 = await provider.placeCall('+2222');
    expect(id1).not.toBe(id2);
  });

  it('answerCall throws with expected message', async () => {
    const provider = new NativePhoneProvider();
    await expect(provider.answerCall('call_1')).rejects.toThrow(
      'Not supported in native dialer mode',
    );
  });

  it('endCall throws with expected message', async () => {
    const provider = new NativePhoneProvider();
    await expect(provider.endCall('call_1')).rejects.toThrow('Not supported in native dialer mode');
  });

  it('holdCall throws with expected message', async () => {
    const provider = new NativePhoneProvider();
    await expect(provider.holdCall('call_1')).rejects.toThrow(
      'Not supported in native dialer mode',
    );
  });

  it('transferCall throws with expected message', async () => {
    const provider = new NativePhoneProvider();
    await expect(provider.transferCall('call_1', '+15559999999')).rejects.toThrow(
      'Not supported in native dialer mode',
    );
  });
});
