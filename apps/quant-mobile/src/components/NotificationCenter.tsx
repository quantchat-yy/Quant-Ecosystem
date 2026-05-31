import React, { useState, useCallback } from 'react';

export type NotificationType = 'message' | 'calendar' | 'drive' | 'system' | 'social';

export interface MobileNotification {
  id: string;
  appId: string;
  appName: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: Date;
  read: boolean;
}

export interface NotificationCenterProps {
  notifications: MobileNotification[];
  onDismiss: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onNotificationTap?: (notification: MobileNotification) => void;
}

interface NotificationGroup {
  appName: string;
  appId: string;
  items: MobileNotification[];
}

function groupNotifications(notifications: MobileNotification[]): NotificationGroup[] {
  const groups = new Map<string, NotificationGroup>();

  for (const notification of notifications) {
    const existing = groups.get(notification.appId);
    if (existing) {
      existing.items.push(notification);
    } else {
      groups.set(notification.appId, {
        appName: notification.appName,
        appId: notification.appId,
        items: [notification],
      });
    }
  }

  return Array.from(groups.values());
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function NotificationTypeIcon({ type }: { type: NotificationType }): React.ReactElement {
  const iconMap: Record<NotificationType, string> = {
    message: '\u2709',
    calendar: '\uD83D\uDCC5',
    drive: '\uD83D\uDCC1',
    system: '\u2699',
    social: '\uD83D\uDC64',
  };
  return (
    <span className="notification-icon" aria-hidden="true">
      {iconMap[type]}
    </span>
  );
}

export function NotificationCenter({
  notifications,
  onDismiss,
  onMarkAllRead,
  onNotificationTap,
}: NotificationCenterProps): React.ReactElement {
  const [swipingId, setSwipingId] = useState<string | null>(null);

  const handleSwipeStart = useCallback((notificationId: string) => {
    setSwipingId(notificationId);
  }, []);

  const handleSwipeEnd = useCallback(
    (notificationId: string) => {
      if (swipingId === notificationId) {
        onDismiss(notificationId);
        setSwipingId(null);
      }
    },
    [swipingId, onDismiss],
  );

  if (notifications.length === 0) {
    return (
      <div className="notification-center notification-center--empty">
        <div className="notification-center__empty-state">
          <span className="notification-center__empty-icon" aria-hidden="true">
            {'\uD83D\uDD14'}
          </span>
          <h3>All caught up!</h3>
          <p>No new notifications</p>
        </div>
      </div>
    );
  }

  const groups = groupNotifications(notifications);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notification-center">
      <header className="notification-center__header">
        <h2>Notifications</h2>
        {unreadCount > 0 && (
          <button
            className="notification-center__mark-all"
            onClick={onMarkAllRead}
            aria-label="Mark all notifications as read"
          >
            Mark All Read
          </button>
        )}
      </header>

      <div className="notification-center__list" role="list">
        {groups.map((group) => (
          <div key={group.appId} className="notification-center__group">
            <h3 className="notification-center__group-header">{group.appName}</h3>
            {group.items.map((notification) => (
              <div
                key={notification.id}
                className={`notification-center__item ${
                  notification.read ? 'notification-center__item--read' : ''
                } ${swipingId === notification.id ? 'notification-center__item--swiping' : ''}`}
                role="listitem"
                onTouchStart={() => handleSwipeStart(notification.id)}
                onTouchEnd={() => handleSwipeEnd(notification.id)}
                onClick={() => onNotificationTap?.(notification)}
              >
                <NotificationTypeIcon type={notification.type} />
                <div className="notification-center__content">
                  <span className="notification-center__title">{notification.title}</span>
                  <span className="notification-center__body">{notification.body}</span>
                  <span className="notification-center__time">
                    {formatTimestamp(notification.timestamp)}
                  </span>
                </div>
                <button
                  className="notification-center__dismiss"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(notification.id);
                  }}
                  aria-label={`Dismiss notification: ${notification.title}`}
                >
                  {'\u2715'}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
