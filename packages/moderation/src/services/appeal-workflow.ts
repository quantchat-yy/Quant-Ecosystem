// ============================================================================
// Moderation - Appeal Workflow
// Appeal lifecycle with AppealRecord creation for every moderation action
// ============================================================================

import type { AppealRecord, ModerationAction, ModerationResult } from '../types';
import { AppealRecordSchema } from '../types';

interface AppealWorkflowConfig {
  maxAppealsPerUser: number;
  cooldownDays: number;
}

const DEFAULT_CONFIG: AppealWorkflowConfig = {
  maxAppealsPerUser: 3,
  cooldownDays: 30,
};

/**
 * AppealWorkflow - Manages moderation appeal records
 *
 * Every moderation action creates an auditable AppealRecord.
 * Supports human review assignment and resolution.
 */
export class AppealWorkflow {
  private config: AppealWorkflowConfig;
  private records: Map<string, AppealRecord>;
  private userRecords: Map<string, string[]>;
  private counter: number = 0;

  constructor(config: Partial<AppealWorkflowConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.records = new Map();
    this.userRecords = new Map();
  }

  /** Create an AppealRecord from a moderation action */
  createFromAction(moderationResult: ModerationResult, userId: string): AppealRecord {
    this.counter++;
    const record: AppealRecord = {
      id: `ar_${Date.now()}_${this.counter}`,
      contentId: moderationResult.contentId,
      userId,
      originalAction: moderationResult.action,
      reason: `Automated moderation: ${moderationResult.flags.join(', ') || 'no flags'}`,
      evidence: moderationResult.categories
        .filter((c) => c.detected)
        .map((c) => `${c.category}: score=${c.score.toFixed(2)}`),
      status: 'submitted',
      source: 'automated',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Validate with Zod schema
    AppealRecordSchema.parse(record);

    this.records.set(record.id, record);
    const userList = this.userRecords.get(userId) ?? [];
    userList.push(record.id);
    this.userRecords.set(userId, userList);

    return record;
  }

  /** Submit a user-initiated appeal */
  submitAppeal(params: {
    contentId: string;
    userId: string;
    originalAction: ModerationAction;
    reason: string;
    evidence?: string[];
  }): AppealRecord {
    const userList = this.userRecords.get(params.userId) ?? [];
    const recentAppeals = userList.filter((id) => {
      const record = this.records.get(id);
      return (
        record &&
        record.source === 'user_initiated' &&
        Date.now() - record.createdAt < this.config.cooldownDays * 86400000
      );
    });

    if (recentAppeals.length >= this.config.maxAppealsPerUser) {
      throw new Error(
        `Maximum appeals (${this.config.maxAppealsPerUser}) reached within cooldown period`,
      );
    }

    this.counter++;
    const record: AppealRecord = {
      id: `ar_${Date.now()}_${this.counter}`,
      contentId: params.contentId,
      userId: params.userId,
      originalAction: params.originalAction,
      reason: params.reason,
      evidence: params.evidence ?? [],
      status: 'submitted',
      source: 'user_initiated',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    AppealRecordSchema.parse(record);

    this.records.set(record.id, record);
    userList.push(record.id);
    this.userRecords.set(params.userId, userList);

    return record;
  }

  /** Assign an appeal to a human reviewer */
  assign(recordId: string, reviewerId: string): AppealRecord {
    const record = this.getRecordOrThrow(recordId);
    record.status = 'human_review';
    record.assignedTo = reviewerId;
    record.updatedAt = Date.now();
    return record;
  }

  /** Resolve an appeal with a decision */
  resolve(
    recordId: string,
    params: { status: 'approved' | 'denied'; resolution: string },
  ): AppealRecord {
    const record = this.getRecordOrThrow(recordId);
    if (record.status === 'approved' || record.status === 'denied') {
      throw new Error('Appeal is already resolved');
    }
    record.status = params.status;
    record.resolution = params.resolution;
    record.resolvedAt = Date.now();
    record.updatedAt = Date.now();
    return record;
  }

  /** Get all records for a user */
  getRecordsForUser(userId: string): AppealRecord[] {
    const ids = this.userRecords.get(userId) ?? [];
    return ids.map((id) => this.records.get(id)).filter((r): r is AppealRecord => r !== undefined);
  }

  /** Get all records */
  getAllRecords(): AppealRecord[] {
    return Array.from(this.records.values());
  }

  /** Get record by ID */
  getRecord(recordId: string): AppealRecord | undefined {
    return this.records.get(recordId);
  }

  private getRecordOrThrow(id: string): AppealRecord {
    const record = this.records.get(id);
    if (!record) throw new Error(`Appeal record not found: ${id}`);
    return record;
  }
}
