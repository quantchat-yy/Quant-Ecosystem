import type { RobotCommand } from '../types.js';
import type { RobotRegistry } from '../registry/robot-registry.js';
import type { RobotSafety } from '../safety/robot-safety.js';
export class CommandDispatcher {
  private history: RobotCommand[] = [];
  constructor(
    private registry: RobotRegistry,
    private safety: RobotSafety,
  ) {}
  dispatch(cmd: RobotCommand): boolean {
    if (this.registry.getStatus(cmd.robotId) === null) return false;
    if (!this.safety.validateCommand(cmd)) return false;
    this.history.push(cmd);
    return true;
  }
  // prettier-ignore
  getHistory(robotId: string): RobotCommand[] { return this.history.filter((c) => c.robotId === robotId); }
  // prettier-ignore
  killSwitch(): void { this.safety.killAll(); }
}
