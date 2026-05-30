// ============================================================================
// WS Gateway - Cross-App Event Handlers
// Subscribes to EventBus and relays events to WebSocket clients
// ============================================================================

import type { RealtimeEvent } from '@quant/realtime';
import { EventBus } from '@quant/realtime';
import pino from 'pino';

const logger = pino({ name: 'ws-gateway:events' });

export interface EventRelayConfig {
  broadcast: (channel: string, event: RealtimeEvent) => void;
}

/**
 * Register cross-app event handlers on the EventBus.
 * These handlers relay events from app backends to connected WebSocket clients.
 */
export function registerEventHandlers(config: EventRelayConfig): void {
  const bus = EventBus.getInstance();

  // Subscribe to all events and relay to WebSocket clients
  bus.subscribe('*', (event: RealtimeEvent) => {
    logger.debug({ type: event.type, channel: event.channel }, 'Relaying event to clients');
    config.broadcast(event.channel, event);
  });

  // Subscribe to specific high-priority channels
  bus.subscribe('notifications', (event: RealtimeEvent) => {
    logger.info(
      { type: event.type, recipients: event.metadata?.recipientIds },
      'Broadcasting notification',
    );
    config.broadcast(`user:${event.senderId}:notifications`, event);
  });

  bus.subscribe('messages', (event: RealtimeEvent) => {
    const conversationId = (event.payload as Record<string, unknown>)?.conversationId;
    if (conversationId) {
      config.broadcast(`conversation:${conversationId as string}`, event);
    }
  });

  bus.subscribe('presence', (event: RealtimeEvent) => {
    config.broadcast('presence', event);
  });

  logger.info('Cross-app event handlers registered');
}
