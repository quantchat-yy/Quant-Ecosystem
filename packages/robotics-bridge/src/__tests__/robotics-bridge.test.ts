import { RobotRegistry } from '../registry/robot-registry.js';
import { RobotSafety } from '../safety/robot-safety.js';
import { CommandDispatcher } from '../commands/command-dispatcher.js';
import type { Robot } from '../types.js';
// prettier-ignore
const bot = (o: Partial<Robot> = {}): Robot => ({ id: 'r1', name: 'B', type: 'vacuum', status: 'idle', capabilities: ['clean'], ...o });
describe('RobotRegistry', () => {
  it('register, query, unregister, filter by capability', () => {
    const r = new RobotRegistry();
    r.register(bot());
    expect(r.getStatus('r1')).toBe('idle');
    expect(r.unregister('r1')).toBe(true);
    expect(r.unregister('r1')).toBe(false);
    r.register(bot({ id: 'a' }));
    r.register(bot({ id: 'b', capabilities: ['patrol'] }));
    expect(r.listByCapability('clean')).toHaveLength(1);
    expect(r.listByCapability('deliver')).toHaveLength(0);
  });
});
describe('RobotSafety', () => {
  it('validates, blocks stopped, killAll, audit', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active', capabilities: ['speak'] }));
    const s = new RobotSafety(reg);
    expect(s.validateCommand({ robotId: 'r1', action: 'speak', params: {}, timestamp: 1 })).toBe(
      true,
    );
    reg.register(bot({ id: 'r2', status: 'stopped' }));
    expect(s.validateCommand({ robotId: 'r2', action: 'x', params: {}, timestamp: 2 })).toBe(false);
    s.killAll();
    expect(reg.getStatus('r1')).toBe('stopped');
    expect(s.getAuditLog().some((e) => e.result === 'killed')).toBe(true);
  });
});
describe('CommandDispatcher', () => {
  it('dispatches valid, rejects invalid, killSwitch', () => {
    const reg = new RobotRegistry();
    reg.register(bot({ status: 'active', capabilities: ['patrol'] }));
    const d = new CommandDispatcher(reg, new RobotSafety(reg));
    expect(d.dispatch({ robotId: 'r1', action: 'patrol', params: {}, timestamp: 1 })).toBe(true);
    expect(d.getHistory('r1')).toHaveLength(1);
    expect(d.dispatch({ robotId: 'x', action: 'y', params: {}, timestamp: 2 })).toBe(false);
    d.killSwitch();
    expect(reg.getStatus('r1')).toBe('stopped');
  });
});
