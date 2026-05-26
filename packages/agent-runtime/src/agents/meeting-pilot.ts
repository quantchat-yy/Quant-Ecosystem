import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface Meeting {
  id: string;
  title: string;
  startTime: number;
  attendees: string[];
  agenda: string[];
}

export interface MeetingNotes {
  meetingId: string;
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
}

export interface ActionItem {
  description: string;
  assignee: string;
  dueDate: number;
}

export interface MeetingResult {
  prep: Array<{ meetingId: string; prepNotes: string[] }>;
  notes: MeetingNotes[];
  followUps: ActionItem[];
}

export class MeetingPilot extends WorkerAgent {
  private lastResult: MeetingResult | null = null;

  constructor() {
    super({
      id: 'meeting-pilot',
      name: 'Meeting Pilot',
      icon: 'users',
      defaultPermission: PermissionLevel.ACT_LOW,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const action = (task.params?.['action'] as string) ?? 'prep';
      const meetings = (task.params?.['meetings'] as Meeting[] | undefined) ?? [];

      this.lastResult = { prep: [], notes: [], followUps: [] };

      if (action === 'prep') {
        for (const meeting of meetings) {
          this.lastResult.prep.push({
            meetingId: meeting.id,
            prepNotes: this.generatePrepNotes(meeting),
          });
        }
      } else if (action === 'notes') {
        for (const meeting of meetings) {
          const notes = this.generateNotes(meeting);
          this.lastResult.notes.push(notes);
          this.lastResult.followUps.push(...notes.actionItems);
        }
      }

      this.logAction(`meeting-${action}:${meetings.length} meetings`, 'success');
      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getMeetingResult(): MeetingResult | null {
    return this.lastResult;
  }

  private generatePrepNotes(meeting: Meeting): string[] {
    const notes: string[] = [
      `Meeting: ${meeting.title}`,
      `Attendees: ${meeting.attendees.join(', ')}`,
    ];
    for (const item of meeting.agenda) {
      notes.push(`- Prepare talking points for: ${item}`);
    }
    return notes;
  }

  private generateNotes(meeting: Meeting): MeetingNotes {
    return {
      meetingId: meeting.id,
      summary: `Meeting "${meeting.title}" with ${meeting.attendees.length} attendees`,
      actionItems: meeting.agenda.map((item, i) => ({
        description: `Follow up on: ${item}`,
        assignee: meeting.attendees[i % meeting.attendees.length] ?? 'unassigned',
        dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
      })),
      decisions: [`Discussed ${meeting.agenda.length} agenda items`],
    };
  }
}
