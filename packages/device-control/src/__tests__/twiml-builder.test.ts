import { describe, it, expect } from 'vitest';
import { TwiMLBuilder } from '../providers/twiml-builder.js';

describe('TwiMLBuilder', () => {
  it('dial() produces correct XML', () => {
    const xml = TwiMLBuilder.dial('+15551234567');
    expect(xml).toBe('<Response><Dial>+15551234567</Dial></Response>');
  });

  it('dial() includes callerId when provided', () => {
    const xml = TwiMLBuilder.dial('+15551234567', '+15559999999');
    expect(xml).toContain('callerId="+15559999999"');
  });

  it('say() produces correct XML', () => {
    const xml = TwiMLBuilder.say('Hello world');
    expect(xml).toBe('<Response><Say>Hello world</Say></Response>');
  });

  it('say() includes voice attribute', () => {
    const xml = TwiMLBuilder.say('Hi', 'alice');
    expect(xml).toContain('voice="alice"');
  });

  it('hold() with music URL uses Play', () => {
    const xml = TwiMLBuilder.hold('http://music.example.com/hold.mp3');
    expect(xml).toContain('<Play loop="0">http://music.example.com/hold.mp3</Play>');
  });

  it('hold() without URL uses Say+Pause', () => {
    const xml = TwiMLBuilder.hold();
    expect(xml).toContain('<Say>Please hold</Say>');
    expect(xml).toContain('<Pause length="60"/>');
  });

  it('conference() produces correct XML', () => {
    const xml = TwiMLBuilder.conference('room-42');
    expect(xml).toBe('<Response><Dial><Conference>room-42</Conference></Dial></Response>');
  });

  it('gather() produces correct XML with all options', () => {
    const xml = TwiMLBuilder.gather({ action: '/handle', numDigits: 4, timeout: 10 });
    expect(xml).toContain('action="/handle"');
    expect(xml).toContain('numDigits="4"');
    expect(xml).toContain('timeout="10"');
  });

  describe('XML escaping', () => {
    it('escapes special characters in dial number', () => {
      const xml = TwiMLBuilder.dial('+1555"<>&test');
      expect(xml).not.toContain('"<>&test');
      expect(xml).toContain('&amp;');
      expect(xml).toContain('&lt;');
      expect(xml).toContain('&gt;');
      expect(xml).toContain('&quot;');
    });

    it('escapes special characters in callerId attribute', () => {
      const xml = TwiMLBuilder.dial('+1555', 'caller"<>');
      expect(xml).toContain('callerId="caller&quot;&lt;&gt;"');
    });

    it('escapes special characters in say message', () => {
      const xml = TwiMLBuilder.say('Hello <world> & "friends"');
      expect(xml).toContain('Hello &lt;world&gt; &amp; &quot;friends&quot;');
    });

    it('escapes special characters in conference name', () => {
      const xml = TwiMLBuilder.conference('room<inject/>');
      expect(xml).toContain('room&lt;inject/&gt;');
    });

    it('escapes special characters in gather action', () => {
      const xml = TwiMLBuilder.gather({ action: '/handle?a=1&b=2' });
      expect(xml).toContain('action="/handle?a=1&amp;b=2"');
    });
  });
});
