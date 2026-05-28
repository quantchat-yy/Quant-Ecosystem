import type { AuditEntry, RiskLevel, RobotCommand, SafetyRule } from '../types.js';
import type { RobotRegistry } from '../registry/robot-registry.js';

interface Zone {
  id: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

export class RobotSafety {
  private audit: AuditEntry[] = [];
  private rules: SafetyRule[] = [];
  private zones = new Map<string, Zone>();
  private robotZones = new Map<string, string>();

  constructor(private registry: RobotRegistry) {}

  validateCommand(cmd: RobotCommand): boolean {
    const status = this.registry.getStatus(cmd.robotId);
    if (status === 'stopped' || status === 'error') {
      this.logAction(cmd.robotId, cmd.action, 'blocked');
      return false;
    }

    for (const rule of this.rules) {
      if (rule.condition(cmd)) {
        if (rule.riskLevel === 'critical' || rule.riskLevel === 'high') {
          this.logAction(cmd.robotId, cmd.action, 'blocked');
          return false;
        }
      }
    }

    this.logAction(cmd.robotId, cmd.action, 'allowed');
    return true;
  }

  assessRisk(cmd: RobotCommand): RiskLevel {
    for (const rule of this.rules) {
      if (rule.condition(cmd)) {
        return rule.riskLevel;
      }
    }
    return 'low';
  }

  addRule(rule: SafetyRule): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): boolean {
    const idx = this.rules.findIndex((r) => r.id === ruleId);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    return true;
  }

  getRules(): SafetyRule[] {
    return [...this.rules];
  }

  addZone(zone: Zone): void {
    this.zones.set(zone.id, zone);
  }

  assignZone(robotId: string, zoneId: string): boolean {
    if (!this.zones.has(zoneId)) return false;
    this.robotZones.set(robotId, zoneId);
    return true;
  }

  checkGeofence(robotId: string, position: { x: number; y: number }): boolean {
    const zoneId = this.robotZones.get(robotId);
    if (!zoneId) return true;
    const zone = this.zones.get(zoneId);
    if (!zone) return true;
    return (
      position.x >= zone.bounds.minX &&
      position.x <= zone.bounds.maxX &&
      position.y >= zone.bounds.minY &&
      position.y <= zone.bounds.maxY
    );
  }

  overrideWithAudit(cmd: RobotCommand, reason: string): void {
    this.logAction(cmd.robotId, `OVERRIDE:${cmd.action}:${reason}`, 'allowed');
  }

  killAll(): void {
    for (const robot of this.registry.getAll()) {
      this.registry.setStatus(robot.id, 'stopped');
      this.logAction(robot.id, 'killAll', 'killed');
    }
  }

  getAuditLog(): AuditEntry[] {
    return [...this.audit];
  }

  logAction(robotId: string, action: string, result: AuditEntry['result']): void {
    this.audit.push({ robotId, action, timestamp: Date.now(), result });
  }
}
