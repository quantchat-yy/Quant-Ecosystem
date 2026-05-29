import type { HUDElement } from '../types.js';

export interface Notification {
  id: string;
  title: string;
  body: string;
  priority: number;
  timestamp: number;
}

export class NotificationRenderer {
  formatForGlasses(notification: Notification): HUDElement {
    return {
      id: notification.id,
      type: 'notification',
      position: { x: 0, y: 0.9 },
      content: `${notification.title}: ${notification.body}`,
      priority: notification.priority,
      ttl: 5000,
    };
  }

  formatForWatch(notification: Notification): HUDElement {
    return {
      id: notification.id,
      type: 'notification',
      position: { x: 0.5, y: 0.5 },
      content:
        notification.title.length > 20
          ? notification.title.slice(0, 20) + '...'
          : notification.title,
      priority: notification.priority,
      ttl: 10000,
    };
  }

  prioritize(notifications: Notification[]): Notification[] {
    return [...notifications].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return b.timestamp - a.timestamp;
    });
  }
}
