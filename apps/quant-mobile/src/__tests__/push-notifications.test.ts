import { describe, it, expect, beforeEach } from 'vitest';
import { PushNotificationService } from '../plugins/push-notifications.js';
import type { PushNotification, PushToken } from '../plugins/push-notifications.js';

describe('PushNotificationService', () => {
  let service: PushNotificationService;

  beforeEach(() => {
    service = new PushNotificationService();
  });

  describe('register', () => {
    it('should throw if permission not granted', async () => {
      await expect(service.register()).rejects.toThrow('permission not granted');
    });

    it('should return a token after permission granted', async () => {
      await service.requestPermission();
      const token = await service.register();
      expect(token).toBeDefined();
      expect(token.value).toBeTruthy();
      expect(token.platform).toBe('ios');
      expect(token.createdAt).toBeGreaterThan(0);
    });

    it('should store the token for later retrieval', async () => {
      await service.requestPermission();
      const token = await service.register();
      expect(service.getToken()).toEqual(token);
    });
  });

  describe('token generation', () => {
    it('should generate a token with sufficient length', async () => {
      await service.requestPermission();
      const token = await service.register();
      expect(token.value.length).toBeGreaterThanOrEqual(100);
    });
  });

  describe('channel creation', () => {
    it('should create a notification channel', () => {
      service.createChannel({
        id: 'messages',
        name: 'Messages',
        importance: 'high',
        vibration: true,
      });
      const channels = service.getChannels();
      expect(channels).toHaveLength(1);
      expect(channels[0]!.id).toBe('messages');
      expect(channels[0]!.importance).toBe('high');
    });

    it('should support multiple channels', () => {
      service.createChannel({ id: 'alerts', name: 'Alerts', importance: 'high' });
      service.createChannel({ id: 'updates', name: 'Updates', importance: 'low' });
      expect(service.getChannels()).toHaveLength(2);
    });
  });

  describe('notification handlers', () => {
    it('should call handlers when notification received', () => {
      const received: PushNotification[] = [];
      service.onNotificationReceived((n) => received.push(n));

      const notification: PushNotification = {
        id: 'n1',
        title: 'Test',
        body: 'Hello',
      };
      service._simulateNotification(notification);

      expect(received).toHaveLength(1);
      expect(received[0]!.title).toBe('Test');
    });

    it('should support unsubscription', () => {
      const received: PushNotification[] = [];
      const unsub = service.onNotificationReceived((n) => received.push(n));
      unsub();

      service._simulateNotification({ id: 'n1', title: 'Test', body: 'Hello' });
      expect(received).toHaveLength(0);
    });
  });

  describe('token refresh', () => {
    it('should notify handlers on token refresh', () => {
      const tokens: PushToken[] = [];
      service.onTokenRefresh((t) => tokens.push(t));

      const newToken: PushToken = {
        value: 'new-token',
        platform: 'android',
        createdAt: Date.now(),
      };
      service._simulateTokenRefresh(newToken);

      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.value).toBe('new-token');
      expect(service.getToken()).toEqual(newToken);
    });
  });

  describe('scheduleLocal', () => {
    it('should schedule a local notification', async () => {
      const id = await service.scheduleLocal({
        id: 'local-1',
        title: 'Reminder',
        body: 'Do something',
        scheduledAt: Date.now() + 60000,
      });
      expect(id).toBe('local-1');
    });

    it('should throw for notification without id', async () => {
      await expect(service.scheduleLocal({ id: '', title: 'Test', body: 'Body' })).rejects.toThrow(
        'must have an id',
      );
    });
  });
});
