import { describe, it, expect, beforeEach } from 'vitest';
import { CrashReporter } from '../crash-reporting/crash-reporter.js';

describe('CrashReporter', () => {
  let reporter: CrashReporter;

  beforeEach(() => {
    reporter = new CrashReporter();
    reporter.init('https://sentry.quant.app/123', {
      environment: 'test',
      privacyMode: true,
    });
  });

  describe('init', () => {
    it('should initialize successfully with a DSN', () => {
      const r = new CrashReporter();
      r.init('https://sentry.example.com/1');
      expect(r.isInitialized()).toBe(true);
    });

    it('should throw if DSN is empty', () => {
      const r = new CrashReporter();
      expect(() => r.init('')).toThrow('DSN is required');
    });

    it('should default privacyMode to true', () => {
      const r = new CrashReporter();
      r.init('https://sentry.example.com/1');
      expect(r.isInitialized()).toBe(true);
    });
  });

  describe('captureException', () => {
    it('should capture an error and return an event ID', () => {
      const eventId = reporter.captureException(new Error('test error'));
      expect(eventId).toBeTruthy();
      expect(eventId.length).toBe(32);
    });

    it('should store the event with error details', () => {
      reporter.captureException(new Error('test error'));
      const events = reporter._getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]!.error!.message).toBe('test error');
      expect(events[0]!.level).toBe('error');
    });

    it('should throw if not initialized', () => {
      const r = new CrashReporter();
      expect(() => r.captureException(new Error('test'))).toThrow('not initialized');
    });

    it('should set lastEventId', () => {
      const eventId = reporter.captureException(new Error('test'));
      expect(reporter.getLastEventId()).toBe(eventId);
    });
  });

  describe('captureMessage', () => {
    it('should capture a message with default info level', () => {
      reporter.captureMessage('something happened');
      const events = reporter._getEvents();
      expect(events[0]!.message).toBe('something happened');
      expect(events[0]!.level).toBe('info');
    });

    it('should accept custom severity level', () => {
      reporter.captureMessage('warning msg', 'warning');
      const events = reporter._getEvents();
      expect(events[0]!.level).toBe('warning');
    });
  });

  describe('breadcrumbs', () => {
    it('should add breadcrumbs', () => {
      reporter.addBreadcrumb({ type: 'navigation', message: 'navigated to /home' });
      reporter.addBreadcrumb({ type: 'ui', message: 'button clicked' });
      const crumbs = reporter._getBreadcrumbs();
      expect(crumbs).toHaveLength(2);
    });

    it('should enforce FIFO at max 100 breadcrumbs', () => {
      for (let i = 0; i < 120; i++) {
        reporter.addBreadcrumb({ type: 'ui', message: `action ${i}` });
      }
      const crumbs = reporter._getBreadcrumbs();
      expect(crumbs).toHaveLength(100);
      expect(crumbs[0]!.message).toBe('action 20');
      expect(crumbs[99]!.message).toBe('action 119');
    });

    it('should include breadcrumbs in captured events', () => {
      reporter.addBreadcrumb({ type: 'navigation', message: 'went to /settings' });
      reporter.captureException(new Error('crash'));
      const events = reporter._getEvents();
      expect(events[0]!.breadcrumbs).toHaveLength(1);
      expect(events[0]!.breadcrumbs[0]!.message).toBe('went to /settings');
    });

    it('should auto-set timestamp if not provided', () => {
      reporter.addBreadcrumb({ type: 'system', message: 'boot' });
      const crumbs = reporter._getBreadcrumbs();
      expect(crumbs[0]!.timestamp).toBeGreaterThan(0);
    });
  });

  describe('privacy mode', () => {
    it('should strip PII from context in privacy mode', () => {
      reporter.captureException(new Error('err'), {
        email: 'user@test.com',
        phone: '555-1234',
        action: 'login',
      });
      const events = reporter._getEvents();
      const ctx = events[0]!.context!;
      expect(ctx['email']).toBe('[REDACTED]');
      expect(ctx['phone']).toBe('[REDACTED]');
      expect(ctx['action']).toBe('login');
    });

    it('should strip email from user in privacy mode', () => {
      reporter.setUser({ id: 'user-1', email: 'private@test.com' });
      reporter.captureException(new Error('err'));
      const events = reporter._getEvents();
      expect(events[0]!.user!.id).toBe('user-1');
      expect(events[0]!.user!.email).toBeUndefined();
    });

    it('should include email when privacy mode is off', () => {
      const r = new CrashReporter();
      r.init('https://sentry.example.com/1', { privacyMode: false });
      r.setUser({ id: 'user-1', email: 'visible@test.com' });
      r.captureException(new Error('err'));
      const events = r._getEvents();
      expect(events[0]!.user!.email).toBe('visible@test.com');
    });
  });

  describe('tags', () => {
    it('should include tags in captured events', () => {
      reporter.setTag('version', '1.2.3');
      reporter.setTag('platform', 'ios');
      reporter.captureException(new Error('err'));
      const events = reporter._getEvents();
      expect(events[0]!.tags['version']).toBe('1.2.3');
      expect(events[0]!.tags['platform']).toBe('ios');
    });
  });
});
