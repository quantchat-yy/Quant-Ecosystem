// ============================================================================
// Notification Hub - Tests
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { NotificationHub } from '../services/notification-hub.service';

describe('NotificationHub', () => {
  let hub: NotificationHub;

  beforeEach(() => {
    hub = new NotificationHub();
    hub.registerApp('quantchat', {
      displayName: 'QuantChat',
      defaultPriority: 'normal',
      defaultChannels: ['push', 'in_app'],
      enabled: true,
    });
    hub.registerApp('quantmail', {
      displayName: 'QuantMail',
      defaultPriority: 'high',
      defaultChannels: ['push', 'email'],
      enabled: true,
    });
    hub.registerApp('quantmeet', {
      displayName: 'QuantMeet',
      defaultPriority: 'high',
      defaultChannels: ['push', 'in_app'],
      enabled: true,
    });
  });

  describe('registerApp', () => {
    it('should register an app successfully', () => {
      const app = hub.getApp('quantchat');
      expect(app).toBeDefined();
      expect(app!.displayName).toBe('QuantChat');
      expect(app!.defaultPriority).toBe('normal');
    });

    it('should list all registered apps', () => {
      const apps = hub.getRegisteredApps();
      expect(apps).toHaveLength(3);
      expect(apps.map((a) => a.appId)).toContain('quantchat');
      expect(apps.map((a) => a.appId)).toContain('quantmail');
    });

    it('should throw if appId is empty', () => {
      expect(() =>
        hub.registerApp('', {
          displayName: 'Test',
          defaultPriority: 'normal',
          defaultChannels: [],
          enabled: true,
        }),
      ).toThrow();
    });

    it('should throw if displayName is empty', () => {
      expect(() =>
        hub.registerApp('test', {
          displayName: '',
          defaultPriority: 'normal',
          defaultChannels: [],
          enabled: true,
        }),
      ).toThrow();
    });
  });

  describe('dispatchNotification', () => {
    it('should dispatch a notification from a registered app', () => {
      const notif = hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'New message',
        body: 'Hello from QuantChat',
      });

      expect(notif.id).toBeDefined();
      expect(notif.appId).toBe('quantchat');
      expect(notif.userId).toBe('user1');
      expect(notif.status).toBe('delivered');
      expect(notif.title).toBe('New message');
    });

    it('should throw for unregistered app', () => {
      expect(() =>
        hub.dispatchNotification('unknown', 'user1', {
          type: 'message',
          title: 'test',
          body: 'test',
        }),
      ).toThrow("App 'unknown' is not registered");
    });

    it('should throw for disabled app', () => {
      hub.registerApp('disabled', {
        displayName: 'Disabled App',
        defaultPriority: 'normal',
        defaultChannels: [],
        enabled: false,
      });

      expect(() =>
        hub.dispatchNotification('disabled', 'user1', {
          type: 'message',
          title: 'test',
          body: 'test',
        }),
      ).toThrow("App 'disabled' is disabled");
    });

    it('should use app default priority when not specified', () => {
      const notif = hub.dispatchNotification('quantmail', 'user1', {
        type: 'message',
        title: 'Email',
        body: 'New email received',
      });
      expect(notif.priority).toBe('high');
    });

    it('should use specified priority over app default', () => {
      const notif = hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Urgent',
        body: 'Important message',
        priority: 'critical',
      });
      expect(notif.priority).toBe('critical');
    });
  });

  describe('getUnifiedInbox', () => {
    it('should return all notifications for a user sorted by time', () => {
      hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Chat msg 1',
        body: 'Hello',
      });
      hub.dispatchNotification('quantmail', 'user1', {
        type: 'message',
        title: 'Email 1',
        body: 'New email',
      });
      hub.dispatchNotification('quantmeet', 'user1', {
        type: 'reminder',
        title: 'Meeting soon',
        body: 'Your meeting starts in 5 min',
      });

      const inbox = hub.getUnifiedInbox('user1');
      expect(inbox).toHaveLength(3);
      // Sorted by time descending
      expect(inbox[0].createdAt).toBeGreaterThanOrEqual(inbox[1].createdAt);
    });

    it('should filter by app', () => {
      hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Chat',
        body: 'hi',
      });
      hub.dispatchNotification('quantmail', 'user1', {
        type: 'message',
        title: 'Mail',
        body: 'hi',
      });

      const inbox = hub.getUnifiedInbox('user1', { appIds: ['quantchat'] });
      expect(inbox).toHaveLength(1);
      expect(inbox[0].appId).toBe('quantchat');
    });

    it('should filter by unread only', () => {
      const notif = hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Read me',
        body: 'hi',
      });
      hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Unread',
        body: 'hi',
      });

      hub.markAsRead('user1', notif.id);

      const inbox = hub.getUnifiedInbox('user1', { unreadOnly: true });
      expect(inbox).toHaveLength(1);
      expect(inbox[0].title).toBe('Unread');
    });

    it('should return empty for unknown user', () => {
      const inbox = hub.getUnifiedInbox('unknown');
      expect(inbox).toHaveLength(0);
    });

    it('should support pagination with limit and offset', () => {
      for (let i = 0; i < 5; i++) {
        hub.dispatchNotification('quantchat', 'user1', {
          type: 'message',
          title: `Msg ${i}`,
          body: 'hi',
        });
      }

      const page1 = hub.getUnifiedInbox('user1', { limit: 2, offset: 0 });
      const page2 = hub.getUnifiedInbox('user1', { limit: 2, offset: 2 });
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0].id).not.toBe(page2[0].id);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', () => {
      const notif = hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Test',
        body: 'hi',
      });
      const result = hub.markAsRead('user1', notif.id);
      expect(result).toBe(true);

      const status = hub.getDeliveryStatus(notif.id);
      expect(status).toBe('read');
    });

    it('should return false for non-existent notification', () => {
      const result = hub.markAsRead('user1', 'non_existent');
      expect(result).toBe(false);
    });

    it('should return false if user does not own the notification', () => {
      const notif = hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Test',
        body: 'hi',
      });
      const result = hub.markAsRead('user2', notif.id);
      expect(result).toBe(false);
    });
  });

  describe('getUnreadCounts', () => {
    it('should return per-app unread counts', () => {
      hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Chat 1',
        body: 'hi',
      });
      hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Chat 2',
        body: 'hi',
      });
      hub.dispatchNotification('quantmail', 'user1', {
        type: 'message',
        title: 'Mail 1',
        body: 'hi',
      });

      const counts = hub.getUnreadCounts('user1');
      expect(counts.total).toBe(3);
      expect(counts.byApp['quantchat']).toBe(2);
      expect(counts.byApp['quantmail']).toBe(1);
    });

    it('should decrease when notifications are read', () => {
      const n1 = hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Chat',
        body: 'hi',
      });
      hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Chat 2',
        body: 'hi',
      });

      hub.markAsRead('user1', n1.id);

      const counts = hub.getUnreadCounts('user1');
      expect(counts.total).toBe(1);
      expect(counts.byApp['quantchat']).toBe(1);
    });

    it('should return zero counts for unknown user', () => {
      const counts = hub.getUnreadCounts('unknown');
      expect(counts.total).toBe(0);
      expect(counts.byApp).toEqual({});
    });
  });

  describe('setRoutingRules', () => {
    it('should mute notifications for a specific app', () => {
      hub.setRoutingRules('user1', [{ appId: 'quantchat', action: 'mute' }]);

      const notif = hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Muted',
        body: 'hi',
      });
      // Muted notifications are delivered but bypass normal flow
      expect(notif.status).toBe('delivered');
    });

    it('should retrieve routing rules', () => {
      const rules = [{ appId: 'quantchat', action: 'mute' as const }];
      hub.setRoutingRules('user1', rules);
      expect(hub.getRoutingRules('user1')).toEqual(rules);
    });

    it('should return empty rules for user without rules', () => {
      expect(hub.getRoutingRules('unknown')).toEqual([]);
    });
  });

  describe('batchDispatch', () => {
    it('should dispatch multiple notifications at once', () => {
      const results = hub.batchDispatch([
        { appId: 'quantchat', userId: 'user1', type: 'message', title: 'Chat 1', body: 'hi' },
        { appId: 'quantmail', userId: 'user1', type: 'message', title: 'Mail 1', body: 'hello' },
        { appId: 'quantmeet', userId: 'user2', type: 'reminder', title: 'Meeting', body: 'soon' },
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].appId).toBe('quantchat');
      expect(results[2].userId).toBe('user2');
    });

    it('should skip invalid notifications in batch without failing', () => {
      const results = hub.batchDispatch([
        { appId: 'quantchat', userId: 'user1', type: 'message', title: 'Valid', body: 'hi' },
        { appId: 'unknown_app', userId: 'user1', type: 'message', title: 'Invalid', body: 'hi' },
        { appId: 'quantmail', userId: 'user1', type: 'message', title: 'Also valid', body: 'hi' },
      ]);

      expect(results).toHaveLength(2);
    });
  });

  describe('getDeliveryStatus', () => {
    it('should return delivery status for a notification', () => {
      const notif = hub.dispatchNotification('quantchat', 'user1', {
        type: 'message',
        title: 'Test',
        body: 'hi',
      });
      expect(hub.getDeliveryStatus(notif.id)).toBe('delivered');
    });

    it('should return null for non-existent notification', () => {
      expect(hub.getDeliveryStatus('non_existent')).toBeNull();
    });
  });
});
