import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  attendees: string[];
  location?: string;
}

export interface ScheduleResult {
  created: CalendarEvent[];
  updated: CalendarEvent[];
  conflicts: Array<{ event1: string; event2: string; reason: string }>;
}

export class SchedulePilot extends WorkerAgent {
  private calendar: CalendarEvent[] = [];
  private lastResult: ScheduleResult | null = null;

  constructor() {
    super({
      id: 'schedule-pilot',
      name: 'Schedule Pilot',
      icon: 'calendar',
      defaultPermission: PermissionLevel.ACT_LOW,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const action = (task.params?.['action'] as string) ?? 'organize';
      const events = (task.params?.['events'] as CalendarEvent[] | undefined) ?? [];

      this.lastResult = { created: [], updated: [], conflicts: [] };

      if (action === 'add') {
        for (const event of events) {
          const conflicts = this.findConflicts(event);
          if (conflicts.length > 0) {
            for (const conflict of conflicts) {
              this.lastResult.conflicts.push({
                event1: event.id,
                event2: conflict.id,
                reason: 'Time overlap',
              });
            }
          } else {
            this.calendar.push(event);
            this.lastResult.created.push(event);
          }
        }
      } else if (action === 'organize') {
        // Detect and report conflicts in existing calendar
        for (let i = 0; i < this.calendar.length; i++) {
          for (let j = i + 1; j < this.calendar.length; j++) {
            const a = this.calendar[i]!;
            const b = this.calendar[j]!;
            if (this.isOverlapping(a, b)) {
              this.lastResult.conflicts.push({
                event1: a.id,
                event2: b.id,
                reason: 'Time overlap detected',
              });
            }
          }
        }
      }

      this.logAction(`schedule-${action}:${events.length} events`, 'success', true);
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getScheduleResult(): ScheduleResult | null {
    return this.lastResult;
  }

  getCalendar(): CalendarEvent[] {
    return [...this.calendar];
  }

  private findConflicts(event: CalendarEvent): CalendarEvent[] {
    return this.calendar.filter((existing) => this.isOverlapping(existing, event));
  }

  private isOverlapping(a: CalendarEvent, b: CalendarEvent): boolean {
    return a.start < b.end && b.start < a.end;
  }
}
