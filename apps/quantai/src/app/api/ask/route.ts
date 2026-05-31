import { NextRequest } from 'next/server';
import { CrossAppOrchestrator, ContextManager, allTools } from '@quant/quant-tools';
import type { OrchestratorEvent } from '@quant/quant-tools';

const MAX_INPUT_LENGTH = 2000;
const STREAM_TIMEOUT_MS = 30_000;

interface AskRequestBody {
  input: string;
  userId?: string;
  sessionId?: string;
  context?: {
    currentApp?: string;
    currentItem?: { id: string; type: string; title?: string };
  };
  dryRun?: boolean;
}

export async function POST(request: NextRequest) {
  // Auth check: require Bearer token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.length <= 7) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized: missing or invalid Bearer token' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const body = (await request.json()) as AskRequestBody;

  if (!body.input || typeof body.input !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing required field: input' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Input length validation
  if (body.input.length > MAX_INPUT_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters` }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const userId = body.userId ?? 'anonymous';
  const sessionId = body.sessionId ?? `session-${Date.now()}`;

  const contextManager = new ContextManager({
    currentApp: body.context?.currentApp,
    currentItem: body.context?.currentItem,
  });

  const orchestrator = new CrossAppOrchestrator(allTools, contextManager);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      const unsubscribe = orchestrator.on((event: OrchestratorEvent) => {
        sendEvent(event.type, event.data);
      });

      // Timeout guard: close stream if orchestrator stalls
      let timedOut = false;
      const timeout = setTimeout(() => {
        timedOut = true;
        sendEvent('error', { error: 'Stream timeout: orchestrator did not respond within 30s' });
        unsubscribe();
        controller.close();
      }, STREAM_TIMEOUT_MS);

      try {
        const results = await orchestrator.execute(body.input, {
          userId,
          sessionId,
          dryRun: body.dryRun,
        });

        if (!timedOut) {
          sendEvent('done', { results });
        }
      } catch (err) {
        if (!timedOut) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          sendEvent('error', { error: message });
        }
      } finally {
        clearTimeout(timeout);
        if (!timedOut) {
          unsubscribe();
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
