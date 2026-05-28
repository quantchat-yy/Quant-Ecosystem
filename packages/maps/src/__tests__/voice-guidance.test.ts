import { describe, it, expect } from 'vitest';
import { VoiceGuidance } from '../navigation/voice-guidance.js';
import { type RouteStep } from '../types.js';

describe('VoiceGuidance', () => {
  const guidance = new VoiceGuidance();
  const step: RouteStep = {
    instruction: 'turn right',
    distance: 200,
    duration: 20,
    position: { lat: 20.0, lng: 78.0 },
  };

  it('generates English instruction at 500m', () => {
    const result = guidance.getInstruction(step, 500, 'en');
    expect(result.text).toBe('In about 500 meters, turn right');
    expect(result.language).toBe('en');
    expect(result.distanceTrigger).toBe(500);
  });

  it('generates Hindi instruction containing "meter mein"', () => {
    const result = guidance.getInstruction(step, 500, 'hi');
    expect(result.text).toContain('meter mein');
    expect(result.language).toBe('hi');
  });

  it('generates medium-distance instruction at 200m', () => {
    const result = guidance.getInstruction(step, 200, 'en');
    expect(result.text).toBe('In 200 meters, prepare to turn right');
    expect(result.language).toBe('en');
    expect(result.distanceTrigger).toBe(200);
  });

  it('generates "now" instruction at distance < 200m', () => {
    const result = guidance.getInstruction(step, 100, 'en');
    expect(result.text).toBe('Turn now: turn right');
  });

  it('generates speed alert', () => {
    const alert = guidance.getSpeedAlert(60, 'en');
    expect(alert.text).toContain('60');
    expect(alert.text).toContain('slow down');
  });

  it('generates arrival announcement in English', () => {
    const msg = guidance.getArrivalAnnouncement('en');
    expect(msg.text).toBe('You have arrived');
  });

  it('generates arrival announcement in Hindi', () => {
    const msg = guidance.getArrivalAnnouncement('hi');
    expect(msg.text).toBe('Aap apni manzil par pahunch gaye hain');
  });
});
