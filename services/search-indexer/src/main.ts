// ============================================================================
// Search Indexer Service - Kafka consumer for CDC event indexing
// ============================================================================

import { Kafka, type Consumer, type EachMessagePayload } from 'kafkajs';
import pino from 'pino';
import { SearchClient, VectorClient } from '@quant/search';
import { BatchEmbedder, type EmbeddingProvider } from './embedder';
import { EmailIndexHandler } from './handlers/email.handler';
import { MessageIndexHandler } from './handlers/message.handler';
import { PostIndexHandler } from './handlers/post.handler';
import { VideoIndexHandler } from './handlers/video.handler';
import { FileIndexHandler } from './handlers/file.handler';
import { UserIndexHandler } from './handlers/user.handler';

const logger = pino({ name: 'search-indexer' });

export interface EventPayload {
  type: string;
  payload: unknown;
}

export interface IndexerDeps {
  searchClient: SearchClient;
  vectorClient: VectorClient;
  embedder: BatchEmbedder;
}

export type EventHandler = (payload: unknown) => Promise<void>;

/**
 * Build the event type to handler mapping
 */
export function buildHandlerMap(deps: IndexerDeps): Map<string, EventHandler> {
  const { searchClient, vectorClient, embedder } = deps;

  const emailHandler = new EmailIndexHandler(searchClient, vectorClient, embedder);
  const messageHandler = new MessageIndexHandler(searchClient, vectorClient, embedder);
  const postHandler = new PostIndexHandler(searchClient, vectorClient, embedder);
  const videoHandler = new VideoIndexHandler(searchClient, vectorClient, embedder);
  const fileHandler = new FileIndexHandler(searchClient, vectorClient, embedder);
  const userHandler = new UserIndexHandler(searchClient);

  const handlers = new Map<string, EventHandler>();
  handlers.set('email.created', (p) => emailHandler.handle(p));
  handlers.set('message.created', (p) => messageHandler.handle(p));
  handlers.set('post.created', (p) => postHandler.handle(p));
  handlers.set('post.updated', (p) => postHandler.handle(p));
  handlers.set('video.transcribed', (p) => videoHandler.handle(p));
  handlers.set('file.uploaded', (p) => fileHandler.handle(p));
  handlers.set('user.created', (p) => userHandler.handle(p));
  handlers.set('user.updated', (p) => userHandler.handle(p));

  return handlers;
}

/**
 * Route a single event to the appropriate handler
 */
export async function routeEvent(
  handlers: Map<string, EventHandler>,
  event: EventPayload,
): Promise<void> {
  const handler = handlers.get(event.type);
  if (!handler) {
    logger.warn({ type: event.type }, 'No handler registered for event type');
    return;
  }
  await handler(event.payload);
}

async function main(): Promise<void> {
  const brokers = (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(',');
  const clientId = process.env['KAFKA_CLIENT_ID'] ?? 'search-indexer';
  const groupId = process.env['KAFKA_GROUP_ID'] ?? 'search-indexer-group';
  const topic = process.env['KAFKA_TOPIC'] ?? 'outbox.events';

  const meiliHost = process.env['MEILISEARCH_HOST'] ?? 'http://localhost:7700';
  const meiliKey = process.env['MEILISEARCH_API_KEY'];
  const qdrantHost = process.env['QDRANT_HOST'] ?? 'http://localhost';
  const qdrantPort = Number(process.env['QDRANT_PORT'] ?? '6333');

  const searchClient = new SearchClient(meiliHost, meiliKey);
  const vectorClient = new VectorClient(qdrantHost, qdrantPort);

  // In production this would route to bge-large-en-v1.5 via @quant/ai RoutingTable
  const embeddingProvider: EmbeddingProvider = {
    embed: async (texts: string[]) => {
      // Placeholder: real implementation uses RoutingTable.getRoute('embedding_bulk')
      return texts.map(() => new Array(1024).fill(0) as number[]);
    },
  };
  const embedder = new BatchEmbedder(embeddingProvider);

  const deps: IndexerDeps = { searchClient, vectorClient, embedder };
  const handlers = buildHandlerMap(deps);

  const kafka = new Kafka({ clientId, brokers });
  const consumer: Consumer = kafka.consumer({ groupId });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });

  logger.info({ topic, groupId }, 'Search indexer started, consuming events');

  await consumer.run({
    eachMessage: async ({ message }: EachMessagePayload) => {
      try {
        const value = message.value?.toString();
        if (!value) return;

        const event = JSON.parse(value) as EventPayload;
        await routeEvent(handlers, event);

        logger.debug({ type: event.type }, 'Event processed successfully');
      } catch (error) {
        logger.error({ error, offset: message.offset }, 'Failed to process event');
      }
    },
  });

  const shutdown = async (): Promise<void> => {
    logger.info('Shutting down search indexer...');
    await consumer.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

void main();
