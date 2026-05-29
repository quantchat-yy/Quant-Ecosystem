import type { RouteTarget } from '../types.js';

export interface TargetDefinition {
  app: string;
  description: string;
  supportedActions: string[];
}

export const TARGET_REGISTRY: Record<string, TargetDefinition> = {
  quantmail: {
    app: 'QuantMail',
    description: 'Draft and send emails',
    supportedActions: ['draft', 'reply', 'forward'],
  },
  quanttasks: {
    app: 'QuantTasks',
    description: 'Create and manage tasks',
    supportedActions: ['create', 'update', 'complete'],
  },
  quantdocs: {
    app: 'QuantDocs',
    description: 'Create notes and idea documents',
    supportedActions: ['create-note', 'create-idea', 'append'],
  },
  quantcalendar: {
    app: 'QuantCalendar',
    description: 'Create events and reminders',
    supportedActions: ['create-event', 'set-reminder'],
  },
  notifications: {
    app: 'Notifications',
    description: 'Set reminders and alerts',
    supportedActions: ['set-reminder', 'alert'],
  },
};

export function createRouteTarget(
  appKey: string,
  action: string,
  payload: Record<string, unknown> = {},
): RouteTarget {
  const target = TARGET_REGISTRY[appKey];
  if (!target) {
    throw new Error(`Unknown target app: ${appKey}`);
  }

  return {
    app: target.app,
    action,
    payload,
  };
}

export function getAvailableTargets(): TargetDefinition[] {
  return Object.values(TARGET_REGISTRY);
}
