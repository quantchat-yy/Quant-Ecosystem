import type { Robot, RobotCapability, RobotStatus } from '../types.js';
export class RobotRegistry {
  private robots = new Map<string, Robot>();
  // prettier-ignore
  register(robot: Robot): void { this.robots.set(robot.id, robot); }
  // prettier-ignore
  unregister(id: string): boolean { return this.robots.delete(id); }
  // prettier-ignore
  getStatus(id: string): RobotStatus | null { return this.robots.get(id)?.status ?? null; }
  setStatus(id: string, status: RobotStatus): boolean {
    const robot = this.robots.get(id);
    if (!robot) return false;
    robot.status = status;
    return true;
  }
  listByCapability(cap: RobotCapability): Robot[] {
    return [...this.robots.values()].filter((r) => r.capabilities.includes(cap));
  }
  // prettier-ignore
  getAll(): Robot[] { return [...this.robots.values()]; }
}
