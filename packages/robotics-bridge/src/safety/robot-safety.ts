import type { AuditEntry, RobotCommand } from '../types.js';
import type { RobotRegistry } from '../registry/robot-registry.js';
export class RobotSafety {
  private audit: AuditEntry[] = [];
  constructor(private registry: RobotRegistry) {}
  validateCommand(cmd: RobotCommand): boolean {
    const status = this.registry.getStatus(cmd.robotId);
    if (status === 'stopped' || status === 'error') {
      this.logAction(cmd.robotId, cmd.action, 'blocked');
      return false;
    }
    this.logAction(cmd.robotId, cmd.action, 'allowed');
    return true;
  }
  killAll(): void {
    for (const robot of this.registry.getAll()) {
      robot.status = 'stopped';
      this.logAction(robot.id, 'killAll', 'killed');
    }
  }
  // prettier-ignore
  getAuditLog(): AuditEntry[] { return [...this.audit]; }
  logAction(robotId: string, action: string, result: AuditEntry['result']): void {
    this.audit.push({ robotId, action, timestamp: Date.now(), result });
  }
}
