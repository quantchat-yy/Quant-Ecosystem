import { SafetyLevel } from './types.js';
import type { SafetyClassificationResult } from './types.js';

export interface SafetyRule {
  id: string;
  description: string;
  check: (action: string, context: Record<string, unknown>) => boolean;
  level: SafetyLevel;
}

const SEVERITY_RANK: Record<SafetyLevel, number> = {
  [SafetyLevel.Safe]: 0,
  [SafetyLevel.Caution]: 1,
  [SafetyLevel.Blocked]: 2,
};

export class SafetyClassifier {
  private rules: SafetyRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.rules.push({
      id: 'PII_WITHOUT_CONSENT',
      description: 'Block PII access without user consent',
      check: (_action: string, context: Record<string, unknown>) => {
        return context['piiAccess'] === true && context['consent'] === false;
      },
      level: SafetyLevel.Blocked,
    });

    this.rules.push({
      id: 'FINANCIAL_HIGH_VALUE',
      description: 'Caution for high-value financial actions',
      check: (action: string, context: Record<string, unknown>) => {
        const isFinancial =
          action.toLowerCase().includes('payment') || action.toLowerCase().includes('transfer');
        const amount = typeof context['amount'] === 'number' ? context['amount'] : 0;
        return isFinancial && amount > 1000;
      },
      level: SafetyLevel.Caution,
    });

    this.rules.push({
      id: 'ADMIN_ACTION',
      description: 'Caution for admin-level actions',
      check: (action: string, _context: Record<string, unknown>) => {
        const actionLower = action.toLowerCase();
        return (
          actionLower.includes('delete_account') ||
          actionLower.includes('change_role') ||
          actionLower.includes('billing')
        );
      },
      level: SafetyLevel.Caution,
    });

    this.rules.push({
      id: 'MODERATION_OVERRIDE',
      description: 'Block moderation override attempts',
      check: (action: string, _context: Record<string, unknown>) => {
        return action.toLowerCase().includes('override_moderation');
      },
      level: SafetyLevel.Blocked,
    });

    this.rules.push({
      id: 'BULK_ACTION',
      description: 'Caution for bulk actions affecting many records',
      check: (_action: string, context: Record<string, unknown>) => {
        const count = typeof context['affectedCount'] === 'number' ? context['affectedCount'] : 0;
        return count > 100;
      },
      level: SafetyLevel.Caution,
    });
  }

  addRule(rule: SafetyRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
  }

  getRules(): SafetyRule[] {
    return [...this.rules];
  }

  classify(action: string, context: Record<string, unknown>): SafetyClassificationResult {
    const triggeredRules: string[] = [];
    let highestLevel = SafetyLevel.Safe;

    for (const rule of this.rules) {
      if (rule.check(action, context)) {
        triggeredRules.push(rule.id);
        if (SEVERITY_RANK[rule.level] > SEVERITY_RANK[highestLevel]) {
          highestLevel = rule.level;
        }
      }
    }

    const reason =
      triggeredRules.length > 0
        ? `Triggered rules: ${triggeredRules.join(', ')}`
        : 'No rules triggered';

    return {
      level: highestLevel,
      reason,
      rules_triggered: triggeredRules,
    };
  }
}
