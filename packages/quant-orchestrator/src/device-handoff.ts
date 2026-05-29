import type { DeviceType, HandoffState, QueuedAction, SessionContext } from './types.js';

interface RegisteredDevice {
  deviceId: string;
  type: DeviceType;
  registeredAt: number;
}

export class DeviceHandoff {
  private devices = new Map<string, RegisteredDevice>();
  private activeDeviceId: string | null = null;

  registerDevice(deviceId: string, type: DeviceType): void {
    this.devices.set(deviceId, {
      deviceId,
      type,
      registeredAt: Date.now(),
    });

    if (!this.activeDeviceId) {
      this.activeDeviceId = deviceId;
    }
  }

  handoff(from: string, to: string, context: SessionContext): HandoffState {
    if (!this.devices.has(from)) {
      throw new Error(`Device not registered: ${from}`);
    }
    if (!this.devices.has(to)) {
      throw new Error(`Device not registered: ${to}`);
    }

    const state: HandoffState = {
      sessionId: `session-${Date.now()}`,
      fromDevice: from,
      toDevice: to,
      context,
      timestamp: Date.now(),
      pendingActions: [],
    };

    this.activeDeviceId = to;
    return state;
  }

  restore(handoff: HandoffState): SessionContext {
    this.activeDeviceId = handoff.toDevice;
    return {
      ...handoff.context,
      deviceId: handoff.toDevice,
      deviceType: this.getDeviceType(handoff.toDevice),
    };
  }

  handoffWithActions(
    from: string,
    to: string,
    context: SessionContext,
    pendingActions: QueuedAction[],
  ): HandoffState {
    const state = this.handoff(from, to, context);
    return { ...state, pendingActions };
  }

  listDevices(): string[] {
    return Array.from(this.devices.keys());
  }

  getActiveDevice(): string | null {
    return this.activeDeviceId;
  }

  setActiveDevice(deviceId: string): void {
    if (!this.devices.has(deviceId)) {
      throw new Error(`Device not registered: ${deviceId}`);
    }
    this.activeDeviceId = deviceId;
  }

  private getDeviceType(deviceId: string): DeviceType {
    const device = this.devices.get(deviceId);
    return device?.type ?? 'phone';
  }
}
