import { NextRequest } from 'next/server';
import { CrossAppOrchestrator, ContextManager, allTools } from '@quant/quant-tools';
import type { OrchestratorEvent } from '@quant/quant-tools';

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
  const body = (await request.json()) as AskRequestBody;

  if (!body.input || typeof body.input !== 'string') {
    return new Response(JSON.stringify({ error: 'Missing required field: input' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
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

      try {
        const results = await orchestrator.execute(body.input, {
          userId,
          sessionId,
          dryRun: body.dryRun,
        });

        sendEvent('done', { results });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        sendEvent('error', { error: message });
      } finally {
        unsubscribe();
        controller.close();
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
