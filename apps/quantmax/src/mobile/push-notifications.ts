// QuantMax - Push Notifications Service
// Mobile push notification management for productivity/project management platform

export interface NotificationChannel {
  id: string;
  name: string;
  importance: 'urgent' | 'high' | 'default' | 'low';
  sound: string | null;
  vibration: boolean;
  badge: boolean;
}

export interface NotificationPayload {
  id: string;
  channel: MaxNotificationChannel;
  title: string;
  body: string;
  data: Record<string, unknown>;
  deepLink: string;
  timestamp: number;
  groupKey: string;
  actions: NotificationAction[];
}

export interface NotificationAction {
  id: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  requiresAuth?: boolean;
}

export type MaxNotificationChannel =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'sprint_update'
  | 'standup_reminder'
  | 'blocker_reported'
  | 'milestone_reached'
  | 'team_mention';

export interface ScheduledNotification {
  id: string;
  payload: NotificationPayload;
  triggerAt: number;
  repeatInterval?: 'daily' | 'weekly';
  cancelled: boolean;
}

export interface QuietHoursConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
  allowBlockers: boolean;
  allowOverdue: boolean;
  workDaysOnly: boolean;
}

export class PushNotificationService {
  private channels: Map<MaxNotificationChannel, NotificationChannel> = new Map();
  private badgeCount: number = 0;
  private scheduledNotifications: ScheduledNotification[] = [];
  private quietHours: QuietHoursConfig = { enabled: false, startHour: 19, endHour: 8, allowBlockers: true, allowOverdue: true, workDaysOnly: true };
  private groupedNotifications: Map<string, NotificationPayload[]> = new Map();

  constructor() {
    this.registerDefaultChannels();
  }

  private registerDefaultChannels(): void {
    const defaults: Array<[MaxNotificationChannel, NotificationChannel]> = [
      ['task_assigned', { id: 'task_assigned', name: 'Task Assignments', importance: 'high', sound: 'task_assign.wav', vibration: true, badge: true }],
      ['task_due_soon', { id: 'task_due_soon', name: 'Due Soon', importance: 'high', sound: 'due_reminder.wav', vibration: true, badge: true }],
      ['task_overdue', { id: 'task_overdue', name: 'Overdue Tasks', importance: 'urgent', sound: 'overdue_alert.wav', vibration: true, badge: true }],
      ['sprint_update', { id: 'sprint_update', name: 'Sprint Updates', importance: 'default', sound: 'sprint.wav', vibration: false, badge: true }],
      ['standup_reminder', { id: 'standup_reminder', name: 'Standup Reminders', importance: 'high', sound: 'standup.wav', vibration: true, badge: false }],
      ['blocker_reported', { id: 'blocker_reported', name: 'Blockers', importance: 'urgent', sound: 'blocker_critical.wav', vibration: true, badge: true }],
      ['milestone_reached', { id: 'milestone_reached', name: 'Milestones', importance: 'default', sound: 'milestone.wav', vibration: false, badge: true }],
      ['team_mention', { id: 'team_mention', name: 'Team Mentions', importance: 'high', sound: 'mention.wav', vibration: true, badge: true }],
    ];
    defaults.forEach(([key, channel]) => this.channels.set(key, channel));
  }

  public async routeDeepLink(payload: NotificationPayload): Promise<string> {
    const { channel, data } = payload;
    switch (channel) {
      case 'task_assigned': return `/projects/${data.projectId}/tasks/${data.taskId}`;
      case 'task_due_soon': return `/projects/${data.projectId}/tasks/${data.taskId}`;
      case 'task_overdue': return `/projects/${data.projectId}/tasks/${data.taskId}`;
      case 'sprint_update': return `/projects/${data.projectId}/sprints/${data.sprintId}`;
      case 'standup_reminder': return `/projects/${data.projectId}/standups/today`;
      case 'blocker_reported': return `/projects/${data.projectId}/tasks/${data.taskId}/blockers`;
      case 'milestone_reached': return `/projects/${data.projectId}/milestones/${data.milestoneId}`;
      case 'team_mention': return `/projects/${data.projectId}/discussions/${data.discussionId}#${data.mentionId}`;
      default: return `/projects/dashboard`;
    }
  }

  public updateBadgeCount(assignedTasks: number, overdueTasks: number, blockers: number): number {
    this.badgeCount = assignedTasks + overdueTasks + blockers;
    return this.badgeCount;
  }

  public getBadgeCount(): number {
    return this.badgeCount;
  }

  public groupNotification(notification: NotificationPayload): NotificationPayload[] {
    const { groupKey } = notification;
    if (!this.groupedNotifications.has(groupKey)) {
      this.groupedNotifications.set(groupKey, []);
    }
    this.groupedNotifications.get(groupKey)!.push(notification);
    return this.groupedNotifications.get(groupKey)!;
  }

  public scheduleStandupReminder(projectId: string, triggerHour: number): ScheduledNotification {
    const now = new Date();
    const triggerAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), triggerHour, 0, 0).getTime();
    const payload: NotificationPayload = {
      id: `standup_${projectId}`,
      channel: 'standup_reminder',
      title: 'Daily Standup',
      body: 'Time to share your standup update',
      data: { projectId },
      deepLink: `/projects/${projectId}/standups/today`,
      timestamp: Date.now(),
      groupKey: `standup_${projectId}`,
      actions: [{ id: 'open', label: 'Write Update' }, { id: 'skip', label: 'Skip Today' }],
    };
    const scheduled: ScheduledNotification = { id: `sched_standup_${projectId}`, payload, triggerAt, repeatInterval: 'daily', cancelled: false };
    this.scheduledNotifications.push(scheduled);
    return scheduled;
  }

  public buildRichNotification(payload: NotificationPayload): NotificationPayload {
    const actions: NotificationAction[] = [];
    switch (payload.channel) {
      case 'task_assigned':
        actions.push({ id: 'accept', label: 'Accept' }, { id: 'reassign', label: 'Reassign' }, { id: 'view', label: 'View Task' });
        break;
      case 'task_overdue':
        actions.push({ id: 'extend', label: 'Extend Deadline' }, { id: 'mark_done', label: 'Mark Done', requiresAuth: true });
        break;
      case 'blocker_reported':
        actions.push({ id: 'resolve', label: 'Resolve', requiresAuth: true }, { id: 'escalate', label: 'Escalate' }, { id: 'comment', label: 'Comment' });
        break;
    }
    return { ...payload, actions };
  }

  public isInQuietHours(): boolean {
    if (!this.quietHours.enabled) return false;
    const now = new Date();
    if (this.quietHours.workDaysOnly) {
      const day = now.getDay();
      if (day === 0 || day === 6) return true;
    }
    const hour = now.getHours();
    if (this.quietHours.startHour > this.quietHours.endHour) {
      return hour >= this.quietHours.startHour || hour < this.quietHours.endHour;
    }
    return hour >= this.quietHours.startHour && hour < this.quietHours.endHour;
  }

  public shouldDeliverNotification(payload: NotificationPayload): boolean {
    if (!this.isInQuietHours()) return true;
    if (payload.channel === 'blocker_reported' && this.quietHours.allowBlockers) return true;
    if (payload.channel === 'task_overdue' && this.quietHours.allowOverdue) return true;
    return false;
  }

  public setQuietHours(config: QuietHoursConfig): void {
    this.quietHours = config;
  }
}
