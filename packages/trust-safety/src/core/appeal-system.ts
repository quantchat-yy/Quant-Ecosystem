// ============================================================================
// Trust & Safety - Appeal System
// Appeal state machine, evidence chain, reviewer queue, decision templates,
// SLA tracking, fairness monitoring, repeat appeal tracking
// ============================================================================

import type { AppealCase, AppealStatus, ModerationAction } from '../types';

/** Evidence attachment in an appeal */
interface Evidence {
  id: string;
  appealId: string;
  type: 'text' | 'image' | 'link' | 'document';
  content: string;
  submittedBy: string;
  submittedAt: number;
  chainOfCustody: CustodyEntry[];
}

/** Chain of custody entry for evidence integrity */
interface CustodyEntry {
  action: 'submitted' | 'reviewed' | 'transferred' | 'sealed';
  actorId: string;
  timestamp: number;
  hash: string;
}

/** Decision template for appeal outcomes */
interface DecisionTemplate {
  id: string;
  name: string;
  outcome: 'upheld' | 'overturned' | 'partial';
  action: ModerationAction;
  reasonTemplate: string;
  applicableCategories: string[];
}

/** SLA configuration by severity */
interface SLAConfig {
  severity: 'low' | 'medium' | 'high' | 'critical';
  targetResponseHours: number;
  escalationThresholdHours: number;
}

/** Reviewer in the queue */
interface Reviewer {
  id: string;
  name: string;
  isSenior: boolean;
  activeAppeals: number;
  maxCapacity: number;
  totalDecisions: number;
  averageHandleTimeMs: number;
  specializations: string[];
}

/** Fairness metrics tracking */
interface FairnessMetrics {
  period: string;
  totalDecisions: number;
  upheldRate: number;
  overturnedRate: number;
  partialRate: number;
  averageResponseTimeMs: number;
  slaComplianceRate: number;
  byDemographic: Map<string, { total: number; upheldRate: number; overturnedRate: number }>;
}

/** Appeal history entry */
interface AppealHistoryEntry {
  appealId: string;
  userId: string;
  status: AppealStatus;
  decision: 'upheld' | 'overturned' | 'partial' | null;
  submittedAt: number;
  decidedAt: number | null;
}

/**
 * AppealSystem provides a complete appeal workflow with state machine transitions,
 * evidence chain of custody, priority-based reviewer queuing, configurable
 * decision templates, SLA tracking, and fairness monitoring.
 */
export class AppealSystem {
  private readonly appeals: Map<string, AppealCase>;
  private readonly evidence: Map<string, Evidence[]>;
  private readonly reviewers: Map<string, Reviewer>;
  private readonly templates: Map<string, DecisionTemplate>;
  private readonly slaConfigs: SLAConfig[];
  private readonly history: AppealHistoryEntry[];
  private readonly fairnessData: Map<
    string,
    { decisions: Array<{ outcome: string; demographic?: string; timestamp: number }> }
  >;
  private appealCounter: number;
  private evidenceCounter: number;

  constructor() {
    this.appeals = new Map();
    this.evidence = new Map();
    this.reviewers = new Map();
    this.templates = new Map();
    this.history = [];
    this.fairnessData = new Map();
    this.appealCounter = 0;
    this.evidenceCounter = 0;

    // Default SLA configs
    this.slaConfigs = [
      { severity: 'critical', targetResponseHours: 4, escalationThresholdHours: 2 },
      { severity: 'high', targetResponseHours: 24, escalationThresholdHours: 12 },
      { severity: 'medium', targetResponseHours: 72, escalationThresholdHours: 48 },
      { severity: 'low', targetResponseHours: 168, escalationThresholdHours: 120 },
    ];
  }

  /**
   * Submit a new appeal. Initializes in 'submitted' state.
   */
  submitAppeal(
    verdictId: string,
    userId: string,
    reason: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  ): AppealCase {
    const id = `appeal_${++this.appealCounter}`;
    const now = Date.now();

    const sla = this.slaConfigs.find((s) => s.severity === severity) ??
      this.slaConfigs[2] ?? {
        severity: 'medium' as const,
        targetResponseHours: 72,
        escalationThresholdHours: 48,
      };

    const priority = this.calculatePriority(severity, now);

    const appeal: AppealCase = {
      id,
      verdictId,
      userId,
      status: 'submitted',
      reason,
      evidence: [],
      assignedReviewerId: null,
      priority,
      submittedAt: now,
      decidedAt: null,
      decision: null,
      decisionReason: null,
      slaDeadline: now + sla.targetResponseHours * 3600000,
    };

    this.appeals.set(id, appeal);
    this.evidence.set(id, []);

    return appeal;
  }

  /**
   * Transition an appeal to the next state.
   * Valid transitions:
   * submitted -> under_review
   * under_review -> escalated | decided
   * escalated -> senior_review
   * senior_review -> decided
   * decided -> closed
   */
  transition(appealId: string, newStatus: AppealStatus, _actorId?: string): AppealCase | null {
    const appeal = this.appeals.get(appealId);
    if (!appeal) return null;

    const validTransitions: Record<AppealStatus, AppealStatus[]> = {
      submitted: ['under_review'],
      under_review: ['escalated', 'decided'],
      escalated: ['senior_review'],
      senior_review: ['decided'],
      decided: ['closed'],
      closed: [],
    };

    const allowed = validTransitions[appeal.status];
    if (!allowed || !allowed.includes(newStatus)) {
      return null; // Invalid transition
    }

    appeal.status = newStatus;

    // Auto-assign reviewer on under_review
    if (newStatus === 'under_review' && !appeal.assignedReviewerId) {
      const reviewer = this.selectReviewer(false);
      if (reviewer) {
        appeal.assignedReviewerId = reviewer.id;
        reviewer.activeAppeals++;
      }
    }

    // Assign senior reviewer on escalation
    if (newStatus === 'senior_review') {
      const senior = this.selectReviewer(true);
      if (senior) {
        // Release previous reviewer
        if (appeal.assignedReviewerId) {
          const prev = this.reviewers.get(appeal.assignedReviewerId);
          if (prev) prev.activeAppeals = Math.max(0, prev.activeAppeals - 1);
        }
        appeal.assignedReviewerId = senior.id;
        senior.activeAppeals++;
      }
    }

    return appeal;
  }

  /**
   * Decide an appeal with a specific outcome
   */
  decide(
    appealId: string,
    decision: 'upheld' | 'overturned' | 'partial',
    reason: string,
    reviewerId: string,
  ): AppealCase | null {
    const appeal = this.appeals.get(appealId);
    if (!appeal) return null;

    if (appeal.status !== 'under_review' && appeal.status !== 'senior_review') {
      return null; // Can only decide from review states
    }

    appeal.status = 'decided';
    appeal.decision = decision;
    appeal.decisionReason = reason;
    appeal.decidedAt = Date.now();

    // Release reviewer capacity
    const reviewer = this.reviewers.get(reviewerId);
    if (reviewer) {
      reviewer.activeAppeals = Math.max(0, reviewer.activeAppeals - 1);
      reviewer.totalDecisions++;
    }

    // Record in history
    this.history.push({
      appealId: appeal.id,
      userId: appeal.userId,
      status: appeal.status,
      decision,
      submittedAt: appeal.submittedAt,
      decidedAt: appeal.decidedAt,
    });

    // Record for fairness tracking
    const periodKey = new Date().toISOString().slice(0, 7); // YYYY-MM
    const fairness = this.fairnessData.get(periodKey) ?? { decisions: [] };
    fairness.decisions.push({ outcome: decision, timestamp: Date.now() });
    this.fairnessData.set(periodKey, fairness);

    return appeal;
  }

  /**
   * Add evidence to an appeal with chain of custody tracking
   */
  addEvidence(
    appealId: string,
    type: Evidence['type'],
    content: string,
    submittedBy: string,
  ): Evidence | null {
    const appeal = this.appeals.get(appealId);
    if (!appeal) return null;

    if (appeal.status === 'decided' || appeal.status === 'closed') {
      return null; // Cannot add evidence after decision
    }

    const id = `evidence_${++this.evidenceCounter}`;
    const now = Date.now();
    const hash = this.computeEvidenceHash(content, now);

    const evidence: Evidence = {
      id,
      appealId,
      type,
      content,
      submittedBy,
      submittedAt: now,
      chainOfCustody: [
        {
          action: 'submitted',
          actorId: submittedBy,
          timestamp: now,
          hash,
        },
      ],
    };

    const appealEvidence = this.evidence.get(appealId) ?? [];
    appealEvidence.push(evidence);
    this.evidence.set(appealId, appealEvidence);

    appeal.evidence.push(id);
    return evidence;
  }

  /**
   * Register a reviewer
   */
  registerReviewer(
    id: string,
    name: string,
    isSenior: boolean,
    maxCapacity: number,
    specializations: string[] = [],
  ): void {
    this.reviewers.set(id, {
      id,
      name,
      isSenior,
      activeAppeals: 0,
      maxCapacity,
      totalDecisions: 0,
      averageHandleTimeMs: 0,
      specializations,
    });
  }

  /**
   * Select a reviewer based on availability and seniority.
   * Priority scoring: available capacity * (1 / active load)
   */
  private selectReviewer(requireSenior: boolean): Reviewer | null {
    let bestReviewer: Reviewer | null = null;
    let bestScore = -1;

    for (const reviewer of this.reviewers.values()) {
      if (requireSenior && !reviewer.isSenior) continue;
      if (reviewer.activeAppeals >= reviewer.maxCapacity) continue;

      // Score: available capacity weighted by experience
      const availableCapacity = reviewer.maxCapacity - reviewer.activeAppeals;
      const experienceBonus = Math.min(1, reviewer.totalDecisions / 100);
      const score = availableCapacity * (1 + experienceBonus);

      if (score > bestScore) {
        bestScore = score;
        bestReviewer = reviewer;
      }
    }

    return bestReviewer;
  }

  /**
   * Calculate appeal priority: severity_weight * wait_time_factor
   */
  private calculatePriority(severity: string, submittedAt: number): number {
    const severityWeights: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const weight = severityWeights[severity] ?? 2;
    const waitHours = (Date.now() - submittedAt) / 3600000;
    const waitFactor = 1 + Math.log2(1 + waitHours);

    return weight * waitFactor;
  }

  /**
   * Get the reviewer queue sorted by priority
   */
  getQueue(): AppealCase[] {
    const pending = Array.from(this.appeals.values()).filter(
      (a) =>
        a.status === 'submitted' ||
        a.status === 'under_review' ||
        a.status === 'escalated' ||
        a.status === 'senior_review',
    );

    // Recalculate priorities based on current time
    for (const appeal of pending) {
      appeal.priority = this.calculatePriority(
        this.getSeverityFromSLA(appeal.slaDeadline - appeal.submittedAt),
        appeal.submittedAt,
      );
    }

    return pending.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get severity from SLA deadline duration
   */
  private getSeverityFromSLA(durationMs: number): string {
    const hours = durationMs / 3600000;
    if (hours <= 4) return 'critical';
    if (hours <= 24) return 'high';
    if (hours <= 72) return 'medium';
    return 'low';
  }

  /**
   * Check SLA compliance for pending appeals
   */
  checkSLACompliance(): Array<{
    appealId: string;
    status: 'on_track' | 'at_risk' | 'breached';
    remainingMs: number;
  }> {
    const now = Date.now();
    const results: Array<{
      appealId: string;
      status: 'on_track' | 'at_risk' | 'breached';
      remainingMs: number;
    }> = [];

    for (const appeal of this.appeals.values()) {
      if (appeal.status === 'decided' || appeal.status === 'closed') continue;

      const remainingMs = appeal.slaDeadline - now;

      let status: 'on_track' | 'at_risk' | 'breached';
      if (remainingMs <= 0) {
        status = 'breached';
      } else if (remainingMs < (appeal.slaDeadline - appeal.submittedAt) * 0.25) {
        status = 'at_risk';
      } else {
        status = 'on_track';
      }

      results.push({ appealId: appeal.id, status, remainingMs });
    }

    return results;
  }

  /**
   * Register a decision template
   */
  registerTemplate(template: DecisionTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get applicable decision templates for an appeal
   */
  getApplicableTemplates(category?: string): DecisionTemplate[] {
    if (!category) return Array.from(this.templates.values());
    return Array.from(this.templates.values()).filter(
      (t) => t.applicableCategories.includes(category) || t.applicableCategories.length === 0,
    );
  }

  /**
   * Get fairness metrics for a period
   */
  getFairnessMetrics(period?: string): FairnessMetrics {
    const periodKey = period ?? new Date().toISOString().slice(0, 7);

    const decidedAppeals = this.history.filter(
      (h) => h.decidedAt && new Date(h.decidedAt).toISOString().slice(0, 7) === periodKey,
    );

    const total = decidedAppeals.length;
    const upheld = decidedAppeals.filter((h) => h.decision === 'upheld').length;
    const overturned = decidedAppeals.filter((h) => h.decision === 'overturned').length;
    const partial = decidedAppeals.filter((h) => h.decision === 'partial').length;

    // SLA compliance
    const slaResults = this.checkSLACompliance();
    const slaCompliance =
      slaResults.length > 0
        ? slaResults.filter((r) => r.status === 'on_track').length / slaResults.length
        : 1;

    // Average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    for (const h of decidedAppeals) {
      if (h.decidedAt && h.submittedAt) {
        totalResponseTime += h.decidedAt - h.submittedAt;
        responseCount++;
      }
    }

    return {
      period: periodKey,
      totalDecisions: total,
      upheldRate: total > 0 ? upheld / total : 0,
      overturnedRate: total > 0 ? overturned / total : 0,
      partialRate: total > 0 ? partial / total : 0,
      averageResponseTimeMs: responseCount > 0 ? totalResponseTime / responseCount : 0,
      slaComplianceRate: slaCompliance,
      byDemographic: new Map(),
    };
  }

  /**
   * Get repeat appeal rate for a user
   */
  getRepeatAppealRate(userId: string): { totalAppeals: number; repeatRate: number } {
    const userAppeals = this.history.filter((h) => h.userId === userId);
    const totalAppeals = userAppeals.length;

    if (totalAppeals <= 1) return { totalAppeals, repeatRate: 0 };

    // Count appeals that were submitted after a previous appeal was decided
    let repeats = 0;
    const sorted = userAppeals.sort((a, b) => a.submittedAt - b.submittedAt);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const current = sorted[i];
      if (prev && current && prev.decidedAt && current.submittedAt > prev.decidedAt) {
        repeats++;
      }
    }

    return { totalAppeals, repeatRate: totalAppeals > 1 ? repeats / (totalAppeals - 1) : 0 };
  }

  /**
   * Get an appeal by ID
   */
  getAppeal(appealId: string): AppealCase | null {
    return this.appeals.get(appealId) ?? null;
  }

  /**
   * Get evidence for an appeal
   */
  getEvidence(appealId: string): Evidence[] {
    return this.evidence.get(appealId) ?? [];
  }

  /**
   * Get total appeal count
   */
  getAppealCount(): number {
    return this.appeals.size;
  }

  /**
   * Compute a hash for evidence chain of custody
   */
  private computeEvidenceHash(content: string, timestamp: number): string {
    let hash = 0x811c9dc5;
    const input = `${content}:${timestamp}`;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
      hash = hash >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }
}
