import type {
  CategorizedItem,
  RouteTarget,
  StructuredOutput,
  TranscriptionConfig,
} from './types.js';
import { VoiceTranscriber } from './transcription/transcriber.js';
import { ContentCategorizer } from './categorization/categorizer.js';
import { ContentRouter } from './routing/router.js';

export interface ProcessResult {
  segment: import('./types.js').VoiceSegment;
  categorizedItem: CategorizedItem;
  route: RouteTarget;
}

export class BrainDumpEngine {
  private transcriber: VoiceTranscriber;
  private categorizer: ContentCategorizer;
  private router: ContentRouter;

  constructor() {
    this.transcriber = new VoiceTranscriber();
    this.categorizer = new ContentCategorizer();
    this.router = new ContentRouter();
    this.router.configure(this.router.getDefaultRules());
  }

  startDump(userId: string, config: TranscriptionConfig): import('./types.js').BrainDumpSession {
    return this.transcriber.startSessionForUser(userId, config);
  }

  processAudio(sessionId: string, chunk: Buffer): ProcessResult {
    const segment = this.transcriber.processChunk(sessionId, chunk);
    const categorizedItem = this.categorizer.categorize(segment);
    const route = this.router.route(categorizedItem);

    categorizedItem.routeTarget = route;

    return { segment, categorizedItem, route };
  }

  finishDump(sessionId: string): StructuredOutput {
    const segments = this.transcriber.endSession(sessionId);
    const session = this.transcriber.getSession(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const items: CategorizedItem[] = this.categorizer.categorizeBatch(segments);
    const routes: RouteTarget[] = this.router.routeAll(items);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const route = routes[i];
      if (item && route) {
        item.routeTarget = route;
      }
    }

    return { session, items, routes };
  }

  getTranscriber(): VoiceTranscriber {
    return this.transcriber;
  }

  getCategorizer(): ContentCategorizer {
    return this.categorizer;
  }

  getRouter(): ContentRouter {
    return this.router;
  }
}
