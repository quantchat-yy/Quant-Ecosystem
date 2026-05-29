import { describe, it, expect } from 'vitest';
import {
  IntentRouter,
  PhoneFreeManager,
  DailyBriefGenerator,
  ContextTracker,
  DeviceHandoff,
  QuantOrchestrator,
} from '../index.js';
import type { SessionContext, QueuedAction, BriefDataSource } from '../types.js';

function createMockContext(): SessionContext {
  return {
    userId: 'user_001',
    deviceId: 'device_001',
    deviceType: 'phone',
    currentApp: null,
    currentScreen: null,
    ambientContext: 'home',
    phoneFreeMode: false,
    voiceActive: true,
  };
}

describe('IntentRouter', () => {
  const router = new IntentRouter();
  const context = createMockContext();

  it('should route tool intents', () => {
    const result = router.route('send an email to John', context);
    expect(result.type).toBe('tool');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.toolId).toBeDefined();
  });

  it('should route automation intents', () => {
    const result = router.route('automate my morning routine', context);
    expect(result.type).toBe('automation');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.automationId).toBeDefined();
  });

  it('should route codex intents', () => {
    const result = router.route('build app for my todo list', context);
    expect(result.type).toBe('codex');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.codexCommand).toBeDefined();
  });

  it('should fallback to conversation', () => {
    const result = router.route('hello how are you today', context);
    expect(result.type).toBe('conversation');
    expect(result.confidence).toBe(0.1);
  });

  it('should preserve raw transcript', () => {
    const transcript = 'Search for documents about project alpha';
    const result = router.route(transcript, context);
    expect(result.rawTranscript).toBe(transcript);
  });
});

describe('PhoneFreeManager', () => {
  it('should toggle phone-free mode', () => {
    const manager = new PhoneFreeManager();
    expect(manager.isActive()).toBe(false);
    manager.enter();
    expect(manager.isActive()).toBe(true);
    manager.exit();
    expect(manager.isActive()).toBe(false);
  });

  it('should manage action queue', () => {
    const manager = new PhoneFreeManager();
    const action: QueuedAction = {
      id: 'action_1',
      intent: {
        type: 'tool',
        confidence: 0.8,
        rawTranscript: 'send email',
        toolId: 'send',
      },
      enqueuedAt: Date.now(),
    };

    manager.enqueue(action);
    expect(manager.getQueue()).toHaveLength(1);

    const dequeued = manager.dequeue();
    expect(dequeued).toEqual(action);
    expect(manager.getQueue()).toHaveLength(0);
  });

  it('should process queue with handler', async () => {
    const manager = new PhoneFreeManager();
    const action: QueuedAction = {
      id: 'action_1',
      intent: { type: 'tool', confidence: 0.8, rawTranscript: 'test', toolId: 'test' },
      enqueuedAt: Date.now(),
    };
    manager.enqueue(action);

    const results = await manager.processQueue(async () => ({
      success: true,
      type: 'tool',
      data: { done: true },
    }));

    expect(results).toHaveLength(1);
    expect(results[0]!.success).toBe(true);
    expect(manager.getQueue()).toHaveLength(0);
  });

  it('should respect max queue size', () => {
    const manager = new PhoneFreeManager({ maxQueueSize: 2 });
    const makeAction = (id: string): QueuedAction => ({
      id,
      intent: { type: 'tool', confidence: 0.5, rawTranscript: 'test' },
      enqueuedAt: Date.now(),
    });

    expect(manager.enqueue(makeAction('1'))).toBe(true);
    expect(manager.enqueue(makeAction('2'))).toBe(true);
    expect(manager.enqueue(makeAction('3'))).toBe(false);
    expect(manager.getQueue()).toHaveLength(2);
  });
});

describe('DailyBriefGenerator', () => {
  it('should generate empty brief with no sources', async () => {
    const generator = new DailyBriefGenerator();
    const brief = await generator.generate('user_001');
    expect(brief.greeting).toBeDefined();
    expect(brief.upcomingEvents).toHaveLength(0);
    expect(brief.pendingActions).toHaveLength(0);
    expect(brief.suggestedAutomations).toHaveLength(0);
    expect(brief.newsHighlights).toHaveLength(0);
  });

  it('should aggregate from data sources', async () => {
    const source: BriefDataSource = {
      name: 'test-source',
      fetch: async () => [
        {
          id: 'item_1',
          title: 'Meeting',
          description: 'Team standup',
          priority: 'high',
          source: 'calendar',
          actionable: false,
        },
        {
          id: 'item_2',
          title: 'Reply to email',
          description: 'Important email',
          priority: 'medium',
          source: 'mail',
          actionable: true,
        },
      ],
    };

    const generator = new DailyBriefGenerator([source]);
    const brief = await generator.generate('user_001');
    expect(brief.upcomingEvents).toHaveLength(1);
    expect(brief.pendingActions).toHaveLength(1);
  });

  it('should handle source failures gracefully', async () => {
    const failingSource: BriefDataSource = {
      name: 'failing',
      fetch: async () => {
        throw new Error('Network error');
      },
    };
    const workingSource: BriefDataSource = {
      name: 'working',
      fetch: async () => [
        {
          id: '1',
          title: 'Item',
          description: 'Desc',
          priority: 'low',
          source: 'news',
          actionable: false,
        },
      ],
    };

    const generator = new DailyBriefGenerator([failingSource, workingSource]);
    const brief = await generator.generate('user_001');
    expect(brief.newsHighlights).toHaveLength(1);
  });
});

describe('ContextTracker', () => {
  it('should track app context transitions', () => {
    const tracker = new ContextTracker(createMockContext());

    tracker.update({ app: 'Mail', screen: 'Inbox' });
    const current = tracker.getCurrent();
    expect(current.currentApp).toBe('Mail');
    expect(current.currentScreen).toBe('Inbox');
  });

  it('should maintain transition history', () => {
    const tracker = new ContextTracker(createMockContext());

    tracker.update({ app: 'Mail', screen: 'Inbox' });
    tracker.update({ app: 'Calendar', screen: 'Day View' });

    const history = tracker.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0]!.app).toBe('Mail');
  });

  it('should notify transition listeners', () => {
    const tracker = new ContextTracker(createMockContext());
    const transitions: Array<{ from: string | null; to: string }> = [];

    tracker.onTransition((from, to) => {
      transitions.push({ from: from?.app ?? null, to: to.app });
    });

    tracker.update({ app: 'Mail', screen: 'Inbox' });
    tracker.update({ app: 'Calendar', screen: 'Day View' });

    expect(transitions).toHaveLength(2);
    expect(transitions[0]!.from).toBe(null);
    expect(transitions[0]!.to).toBe('Mail');
    expect(transitions[1]!.from).toBe('Mail');
    expect(transitions[1]!.to).toBe('Calendar');
  });
});

describe('DeviceHandoff', () => {
  it('should register devices', () => {
    const handoff = new DeviceHandoff();
    handoff.registerDevice('phone_1', 'phone');
    handoff.registerDevice('watch_1', 'watch');
    expect(handoff.listDevices()).toHaveLength(2);
  });

  it('should handoff session between devices', () => {
    const handoff = new DeviceHandoff();
    handoff.registerDevice('phone_1', 'phone');
    handoff.registerDevice('watch_1', 'watch');

    const context = createMockContext();
    const state = handoff.handoff('phone_1', 'watch_1', context);
    expect(state.fromDevice).toBe('phone_1');
    expect(state.toDevice).toBe('watch_1');
    expect(handoff.getActiveDevice()).toBe('watch_1');
  });

  it('should restore from handoff state', () => {
    const handoff = new DeviceHandoff();
    handoff.registerDevice('phone_1', 'phone');
    handoff.registerDevice('desktop_1', 'desktop');

    const context = createMockContext();
    const state = handoff.handoff('phone_1', 'desktop_1', context);
    const restored = handoff.restore(state);
    expect(restored.deviceId).toBe('desktop_1');
    expect(restored.deviceType).toBe('desktop');
  });

  it('should throw on unregistered device handoff', () => {
    const handoff = new DeviceHandoff();
    handoff.registerDevice('phone_1', 'phone');
    const context = createMockContext();
    expect(() => handoff.handoff('phone_1', 'unknown', context)).toThrow();
  });
});

describe('QuantOrchestrator', () => {
  it('should process voice intents', () => {
    const orchestrator = new QuantOrchestrator();
    const context = createMockContext();
    const result = orchestrator.processVoiceIntent('send email to boss', context);
    expect(result.success).toBe(true);
    expect(result.type).toBe('tool');
    expect(result.spokenResponse).toBeDefined();
  });

  it('should manage phone-free mode', () => {
    const orchestrator = new QuantOrchestrator();
    expect(orchestrator.isPhoneFree()).toBe(false);
    orchestrator.enterPhoneFreeMode();
    expect(orchestrator.isPhoneFree()).toBe(true);
    orchestrator.exitPhoneFreeMode();
    expect(orchestrator.isPhoneFree()).toBe(false);
  });

  it('should track context updates', () => {
    const orchestrator = new QuantOrchestrator();
    orchestrator.updateContext({ app: 'Mail', screen: 'Compose' });
    const ctx = orchestrator.getCurrentContext();
    expect(ctx.currentApp).toBe('Mail');
    expect(ctx.currentScreen).toBe('Compose');
  });

  it('should handle device handoff', () => {
    const orchestrator = new QuantOrchestrator();
    orchestrator.registerDevice('phone_1', 'phone');
    orchestrator.registerDevice('desktop_1', 'desktop');
    const state = orchestrator.handoff('phone_1', 'desktop_1');
    expect(state.fromDevice).toBe('phone_1');
    expect(state.toDevice).toBe('desktop_1');
  });

  it('should generate daily brief', async () => {
    const source: BriefDataSource = {
      name: 'test',
      fetch: async () => [
        {
          id: '1',
          title: 'Meeting',
          description: 'Standup',
          priority: 'high',
          source: 'calendar',
          actionable: false,
        },
      ],
    };
    const orchestrator = new QuantOrchestrator(undefined, [source]);
    const brief = await orchestrator.generateDailyBrief('user_001');
    expect(brief.greeting).toBeDefined();
    expect(brief.upcomingEvents).toHaveLength(1);
  });
});
