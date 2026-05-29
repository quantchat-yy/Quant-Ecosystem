export type DeviceType = 'phone' | 'watch' | 'glasses' | 'desktop' | 'tablet';
export type AmbientContextType = 'home' | 'driving' | 'walking' | 'meeting' | 'working';
export type IntentType = 'tool' | 'automation' | 'codex' | 'conversation';

export interface SessionContext {
  userId: string;
  deviceId: string;
  deviceType: DeviceType;
  currentApp: string | null;
  currentScreen: string | null;
  ambientContext: AmbientContextType;
  phoneFreeMode: boolean;
  voiceActive: boolean;
}

export interface AppContext {
  app: string;
  screen: string;
  metadata?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  type: IntentType | 'error';
  data?: unknown;
  spokenResponse?: string;
}

export interface BriefItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  source: string;
  actionable: boolean;
}

export interface DailyBrief {
  greeting: string;
  weather?: string;
  upcomingEvents: BriefItem[];
  pendingActions: BriefItem[];
  suggestedAutomations: BriefItem[];
  newsHighlights: BriefItem[];
}

export interface RoutedIntent {
  type: IntentType;
  confidence: number;
  toolId?: string;
  automationId?: string;
  codexCommand?: string;
  rawTranscript: string;
}

export interface HandoffState {
  sessionId: string;
  fromDevice: string;
  toDevice: string;
  context: SessionContext;
  timestamp: number;
  pendingActions: QueuedAction[];
}

export interface QueuedAction {
  id: string;
  intent: RoutedIntent;
  enqueuedAt: number;
}

export interface SessionState {
  context: SessionContext;
  activeIntents: RoutedIntent[];
  history: RoutedIntent[];
  lastActive: number;
}

export interface BriefDataSource {
  name: string;
  fetch(userId: string): Promise<BriefItem[]>;
}

export interface OrchestratorConfig {
  sessionTimeoutMs?: number;
  maxQueueSize?: number;
  maxHistorySize?: number;
}
