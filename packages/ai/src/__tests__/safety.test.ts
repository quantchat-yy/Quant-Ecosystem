import { describe, it, expect } from 'vitest';
import { SafetyPipeline } from '../core/safety';

describe('SafetyPipeline', () => {
  const pipeline = new SafetyPipeline();

  describe('PII redaction', () => {
    it('redacts email addresses', () => {
      const text = 'Contact me at john.doe@example.com for more info';
      const result = pipeline.redactPii(text);
      expect(result.redactedText).toBe('Contact me at [EMAIL_REDACTED] for more info');
      expect(result.entities).toHaveLength(1);
      expect(result.entities[0]!.type).toBe('email');
      expect(result.entities[0]!.value).toBe('john.doe@example.com');
    });

    it('redacts phone numbers', () => {
      const text = 'Call me at 555-123-4567 or (800) 555-0199';
      const result = pipeline.redactPii(text);
      expect(result.redactedText).not.toContain('555-123-4567');
      expect(result.redactedText).toContain('[PHONE_REDACTED]');
      expect(result.entities.some((e) => e.type === 'phone')).toBe(true);
    });

    it('redacts SSN patterns', () => {
      const text = 'My SSN is 123-45-6789';
      const result = pipeline.redactPii(text);
      expect(result.redactedText).toBe('My SSN is [SSN_REDACTED]');
      expect(result.entities[0]!.type).toBe('ssn');
    });

    it('redacts credit card numbers', () => {
      const text = 'Card: 4532-1234-5678-9012';
      const result = pipeline.redactPii(text);
      expect(result.redactedText).toContain('[CC_REDACTED]');
      expect(result.entities.some((e) => e.type === 'credit_card')).toBe(true);
    });

    it('redacts IP addresses', () => {
      const text = 'Server at 192.168.1.100 is down';
      const result = pipeline.redactPii(text);
      expect(result.redactedText).toBe('Server at [IP_REDACTED] is down');
      expect(result.entities[0]!.type).toBe('ip_address');
    });

    it('redacts multiple PII types in one text', () => {
      const text = 'Email: test@test.com, Phone: 555-111-2222, IP: 10.0.0.1';
      const result = pipeline.redactPii(text);
      expect(result.redactedText).not.toContain('test@test.com');
      expect(result.redactedText).not.toContain('10.0.0.1');
      expect(result.entities.length).toBeGreaterThanOrEqual(3);
    });

    it('returns empty entities for clean text', () => {
      const text = 'This is a normal sentence without any PII.';
      const result = pipeline.redactPii(text);
      expect(result.redactedText).toBe(text);
      expect(result.entities).toHaveLength(0);
    });
  });

  describe('content moderation', () => {
    it('scores safe content low', () => {
      const result = pipeline.checkContent('Hello, how can I help you today?');
      expect(result.score).toBe(0);
      expect(result.categories.every((c) => !c.flagged)).toBe(true);
    });

    it('flags violent content', () => {
      const result = pipeline.checkContent('I want to attack and kill someone with a weapon');
      expect(result.score).toBeGreaterThan(0.5);
      const violence = result.categories.find((c) => c.name === 'violence');
      expect(violence?.flagged).toBe(true);
    });

    it('flags hate speech', () => {
      const result = pipeline.checkContent('That racist bigot should face supremacy justice');
      const hateSpeech = result.categories.find((c) => c.name === 'hate_speech');
      expect(hateSpeech?.score).toBeGreaterThan(0);
    });
  });

  describe('processInput', () => {
    it('redacts PII and checks safety', () => {
      const result = pipeline.processInput('Email me at user@example.com about the project');
      expect(result.text).not.toContain('user@example.com');
      expect(result.redactedEntities).toHaveLength(1);
      expect(result.isSafe).toBe(true);
    });

    it('marks unsafe content', () => {
      const result = pipeline.processInput('I want to attack and murder and kill the target');
      expect(result.isSafe).toBe(false);
      expect(result.safetyScore).toBeGreaterThan(0.5);
    });
  });

  describe('processOutput', () => {
    it('checks output for safety', () => {
      const result = pipeline.processOutput(
        'Here is the information you requested about cooking recipes.',
      );
      expect(result.isSafe).toBe(true);
    });

    it('redacts any PII leaked in output', () => {
      const result = pipeline.processOutput('The user email is admin@company.com');
      expect(result.text).toContain('[EMAIL_REDACTED]');
    });
  });
});
