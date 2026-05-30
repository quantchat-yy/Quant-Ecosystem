import type { IPReputationRule, IPScore } from './types.js';

interface BlockEntry {
  reason: string;
  blockedUntil: Date;
}

export class IPReputationService {
  private rules: IPReputationRule[];
  private readonly blockedIPs: Map<string, BlockEntry> = new Map();

  constructor(rules: IPReputationRule[]) {
    this.rules = [...rules];
  }

  score(ip: string, _context?: Record<string, unknown>): IPScore {
    const blockEntry = this.blockedIPs.get(ip);
    if (blockEntry && blockEntry.blockedUntil.getTime() > Date.now()) {
      return {
        ip,
        score: 100,
        reasons: [`Blocked: ${blockEntry.reason}`],
        blockedUntil: blockEntry.blockedUntil,
      };
    }

    // Clean up expired blocks
    if (blockEntry && blockEntry.blockedUntil.getTime() <= Date.now()) {
      this.blockedIPs.delete(ip);
    }

    let totalScore = 0;
    const reasons: string[] = [];

    for (const rule of this.rules) {
      const regex = new RegExp(rule.pattern);
      if (regex.test(ip)) {
        totalScore += rule.scoreImpact;
        reasons.push(rule.description);
      }
    }

    // Clamp score between 0 and 100
    const clampedScore = Math.max(0, Math.min(100, totalScore));

    return {
      ip,
      score: clampedScore,
      reasons,
    };
  }

  block(ip: string, reason: string, durationMs: number): void {
    this.blockedIPs.set(ip, {
      reason,
      blockedUntil: new Date(Date.now() + durationMs),
    });
  }

  unblock(ip: string): void {
    this.blockedIPs.delete(ip);
  }

  isBlocked(ip: string): boolean {
    const entry = this.blockedIPs.get(ip);
    if (!entry) {
      return false;
    }
    if (entry.blockedUntil.getTime() <= Date.now()) {
      this.blockedIPs.delete(ip);
      return false;
    }
    return true;
  }

  addRule(rule: IPReputationRule): void {
    this.rules.push(rule);
  }

  getBlockedIPs(): string[] {
    const blocked: string[] = [];
    for (const [ip, entry] of this.blockedIPs) {
      if (entry.blockedUntil.getTime() > Date.now()) {
        blocked.push(ip);
      }
    }
    return blocked;
  }
}
