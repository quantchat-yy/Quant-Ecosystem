export type RobotCapability = 'clean' | 'patrol' | 'deliver' | 'monitor' | 'speak';
export type RobotStatus = 'idle' | 'active' | 'charging' | 'error' | 'stopped';
export interface Robot {
  id: string;
  name: string;
  type: 'vacuum' | 'companion' | 'humanoid' | 'patrol';
  status: RobotStatus;
  capabilities: RobotCapability[];
}
export interface RobotCommand {
  robotId: string;
  action: string;
  params: Record<string, unknown>;
  timestamp: number;
}
export interface AuditEntry {
  robotId: string;
  action: string;
  timestamp: number;
  result: 'allowed' | 'blocked' | 'killed';
}
