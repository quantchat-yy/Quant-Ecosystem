import type {
  ActionResult,
  AppContext,
  BriefDataSource,
  DailyBrief,
  DeviceType,
  HandoffState,
  OrchestratorConfig,
  SessionContext,
} from './types.js';
import { IntentRouter } from './intent-router.js';
import { PhoneFreeManager } from './phone-free.js';
import { DailyBriefGenerator } from './daily-brief.js';
import { ContextTracker } from './context-tracker.js';
import { DeviceHandoff } from './device-handoff.js';

export class QuantOrchestrator {
  private readonly intentRouter: IntentRouter;
  private readonly phoneFreeManager: PhoneFreeManager;
  private readonly briefGenerator: DailyBriefGenerator;
  private readonly contextTracker: ContextTracker;
  private readonly deviceHandoff: DeviceHandoff;

  constructor(config?: OrchestratorConfig, sources?: BriefDataSource[]) {
    this.intentRouter = new IntentRouter();
    this.phoneFreeManager = new PhoneFreeManager(config);
    this.briefGenerator = new DailyBriefGenerator(sources);
    this.contextTracker = new ContextTracker({
      userId: '',
      deviceId: '',
      deviceType: 'phone',
      currentApp: null,
      currentScreen: null,
      ambientContext: 'home',
      phoneFreeMode: false,
      voiceActive: false,
    });
    this.deviceHandoff = new DeviceHandoff();
  }

  processVoiceIntent(transcript: string, context: SessionContext): ActionResult {
    const routed = this.intentRouter.route(transcript, context);

    return {
      success: true,
      type: routed.type,
      data: routed,
      spokenResponse: this.generateSpokenResponse(routed.type, transcript),
    };
  }

  enterPhoneFreeMode(): void {
    this.phoneFreeManager.enter();
  }

  exitPhoneFreeMode(): void {
    this.phoneFreeManager.exit();
  }

  isPhoneFree(): boolean {
    return this.phoneFreeManager.isActive();
  }

  getPhoneFreeManager(): PhoneFreeManager {
    return this.phoneFreeManager;
  }

  async generateDailyBrief(userId: string): Promise<DailyBrief> {
    return this.briefGenerator.generate(userId);
  }

  updateContext(context: AppContext): void {
    this.contextTracker.update(context);
  }

  getCurrentContext(): SessionContext {
    return this.contextTracker.getCurrent();
  }

  registerDevice(deviceId: string, type: DeviceType): void {
    this.deviceHandoff.registerDevice(deviceId, type);
  }

  handoff(from: string, to: string): HandoffState {
    const context = this.contextTracker.getCurrent();
    return this.deviceHandoff.handoff(from, to, context);
  }

  syncState(deviceId: string): SessionContext {
    const activeDevice = this.deviceHandoff.getActiveDevice();
    if (activeDevice && activeDevice !== deviceId) {
      const context = this.contextTracker.getCurrent();
      const handoffState = this.deviceHandoff.handoff(activeDevice, deviceId, context);
      return this.deviceHandoff.restore(handoffState);
    }
    return this.contextTracker.getCurrent();
  }

  getIntentRouter(): IntentRouter {
    return this.intentRouter;
  }

  getBriefGenerator(): DailyBriefGenerator {
    return this.briefGenerator;
  }

  getContextTracker(): ContextTracker {
    return this.contextTracker;
  }

  getDeviceHandoff(): DeviceHandoff {
    return this.deviceHandoff;
  }

  private generateSpokenResponse(type: string, transcript: string): string {
    switch (type) {
      case 'tool':
        return `Executing tool action for: ${transcript}`;
      case 'automation':
        return `Setting up automation: ${transcript}`;
      case 'codex':
        return `Starting codex generation: ${transcript}`;
      case 'conversation':
        return `I heard: ${transcript}`;
      default:
        return `Processing: ${transcript}`;
    }
  }
}
