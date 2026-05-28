import type { SpatialDevice, XRSessionConfig } from '../types.js';
// prettier-ignore
const DEF: SpatialDevice = { id: 'default', name: 'Generic XR Device', type: 'generic', capabilities: ['hand-tracking', 'spatial-audio'] };
export class XRSessionManager {
  private sessions = new Map<string, XRSessionConfig>();
  private devices = new Map<string, SpatialDevice>([['default', DEF]]);
  startSession(config: XRSessionConfig): string {
    const id = `xr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.sessions.set(id, config);
    return id;
  }
  // prettier-ignore
  endSession(id: string): boolean { return this.sessions.delete(id); }
  // prettier-ignore
  getDeviceCaps(deviceId: string): SpatialDevice | null { return this.devices.get(deviceId) ?? null; }
}
