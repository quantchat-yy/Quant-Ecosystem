export interface BrainDumpSession {
  id: string;
  userId: string;
  startedAt: Date;
  status: 'active' | 'paused' | 'completed';
  segments: VoiceSegment[];
}

export interface VoiceSegment {
  id: string;
  startTime: number;
  endTime: number;
  transcript: string;
  confidence: number;
}

export type ContentCategory = 'email' | 'task' | 'idea' | 'note' | 'reminder' | 'question';

export interface CategorizedItem {
  id: string;
  category: ContentCategory;
  content: string;
  extractedEntities: ExtractedEntities;
  confidence: number;
  routeTarget: RouteTarget | null;
}

export interface ExtractedEntities {
  dates: string[];
  people: string[];
  actions: string[];
  topics: string[];
}

export interface RouteTarget {
  app: string;
  action: string;
  payload: Record<string, unknown>;
}

export interface RoutingRule {
  category: ContentCategory;
  targetApp: string;
  actionTemplate: string;
}

export interface TranscriptionConfig {
  language: string;
  model: string;
  streaming: boolean;
}

export interface StructuredOutput {
  session: BrainDumpSession;
  items: CategorizedItem[];
  routes: RouteTarget[];
}
