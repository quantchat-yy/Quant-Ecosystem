import type { PhoneCapability } from '../capabilities/phone.js';
import type { PermissionManager } from '../permissions/permission-manager.js';
import type { CallAgentIntent } from '../providers/types.js';

export interface CallAgentConfig {
  phoneProvider: PhoneCapability;
  permissionManager: PermissionManager;
  allowedContacts?: string[];
}

export interface CallAgentResult {
  success: boolean;
  callSid?: string;
  error?: string;
}

export class CallAgent {
  private phoneProvider: PhoneCapability;
  private permissionManager: PermissionManager;
  private allowedContacts: string[];

  constructor(config: CallAgentConfig) {
    this.phoneProvider = config.phoneProvider;
    this.permissionManager = config.permissionManager;
    this.allowedContacts = config.allowedContacts ?? [];
  }

  async handleIntent(intent: CallAgentIntent): Promise<CallAgentResult> {
    const permState = this.permissionManager.getState('phone');
    if (permState === 'denied') {
      return { success: false, error: 'Phone permission denied' };
    }

    if (intent.action === 'place') {
      if (!intent.target) {
        return { success: false, error: 'No target number specified' };
      }
      const requiredTier = this.allowedContacts.includes(intent.target) ? 2 : 3;
      // Design note: getTier('phone') returns the capability's intrinsic sensitivity
      // tier (3), so this gate only fires if a capability were assigned a lower tier.
      // The real access control is the permission state check above (denied/granted).
      const currentTier = this.permissionManager.getTier('phone');
      if (currentTier < requiredTier) {
        return {
          success: false,
          error: `Insufficient permission tier: need ${requiredTier}, have ${currentTier}`,
        };
      }
      try {
        const callSid = await this.phoneProvider.placeCall(intent.target);
        return { success: true, callSid };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }

    if (intent.action === 'answer') {
      if (!intent.callId) return { success: false, error: 'No callId specified' };
      await this.phoneProvider.answerCall(intent.callId);
      return { success: true, callSid: intent.callId };
    }

    if (intent.action === 'end') {
      if (!intent.callId) return { success: false, error: 'No callId specified' };
      await this.phoneProvider.endCall(intent.callId);
      return { success: true, callSid: intent.callId };
    }

    if (intent.action === 'hold') {
      if (!intent.callId) return { success: false, error: 'No callId specified' };
      await this.phoneProvider.holdCall(intent.callId);
      return { success: true, callSid: intent.callId };
    }

    if (intent.action === 'transfer') {
      if (!intent.callId || !intent.target) {
        return { success: false, error: 'callId and target required for transfer' };
      }
      await this.phoneProvider.transferCall(intent.callId, intent.target);
      return { success: true, callSid: intent.callId };
    }

    return { success: false, error: `Unknown action: ${intent.action}` };
  }
}
