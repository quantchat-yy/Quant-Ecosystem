import { WorkerAgent, AgentTask } from '../worker-agent.js';
import { PermissionLevel } from '../permissions.js';
import { AgentState } from '../state-machine.js';

export interface EmailItem {
  id: string;
  from: string;
  subject: string;
  body: string;
  isSpam: boolean;
  isRead: boolean;
  timestamp: number;
}

export interface EmailProcessingResult {
  archived: string[];
  drafts: Array<{ inReplyTo: string; body: string }>;
  flagged: string[];
}

export class EmailPilot extends WorkerAgent {
  private processedEmails: EmailProcessingResult = { archived: [], drafts: [], flagged: [] };

  constructor() {
    super({
      id: 'email-pilot',
      name: 'Email Pilot',
      icon: 'mail',
      defaultPermission: PermissionLevel.ACT_LOW,
    });
  }

  async execute(task: AgentTask): Promise<void> {
    this.stateMachine.transition(AgentState.EXECUTING);

    try {
      const emails = (task.params?.['emails'] as EmailItem[] | undefined) ?? [];
      this.processedEmails = { archived: [], drafts: [], flagged: [] };

      for (const email of emails) {
        if (email.isSpam) {
          this.processedEmails.archived.push(email.id);
          this.logAction(`archive-spam:${email.id}`, 'success', true);
        } else if (this.needsReply(email)) {
          const draft = this.generateReplyDraft(email);
          this.processedEmails.drafts.push({ inReplyTo: email.id, body: draft });
          this.logAction(`draft-reply:${email.id}`, 'success', true);
        } else {
          this.processedEmails.flagged.push(email.id);
        }
      }

      this.trustScore.recordSuccess();
      this.stateMachine.transition(AgentState.DONE);
    } catch (error) {
      this.trustScore.recordFailure();
      this.stateMachine.transition(AgentState.FAILED);
    }
  }

  getProcessingResult(): EmailProcessingResult {
    return { ...this.processedEmails };
  }

  private needsReply(email: EmailItem): boolean {
    const replyIndicators = ['?', 'please respond', 'awaiting your reply', 'rsvp'];
    const lowerBody = email.body.toLowerCase();
    const lowerSubject = email.subject.toLowerCase();
    return replyIndicators.some((ind) => lowerBody.includes(ind) || lowerSubject.includes(ind));
  }

  private generateReplyDraft(email: EmailItem): string {
    return `Thank you for your email regarding "${email.subject}". I will review and get back to you shortly.`;
  }
}
