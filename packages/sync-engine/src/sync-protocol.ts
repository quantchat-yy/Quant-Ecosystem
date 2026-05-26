import { z } from 'zod';

export const SyncMessageTypeSchema = z.enum(['sync_request', 'sync_response', 'update', 'ack']);

export type SyncMessageType = z.infer<typeof SyncMessageTypeSchema>;

export const SyncMessageSchema = z.object({
  type: SyncMessageTypeSchema,
  documentId: z.string().min(1),
  payload: z.instanceof(Uint8Array).optional(),
  timestamp: z.number(),
  messageId: z.string().min(1),
});

export type SyncMessage = z.infer<typeof SyncMessageSchema>;

export const ReconnectConfigSchema = z.object({
  maxRetries: z.number().int().positive().default(5),
  baseDelay: z.number().positive().default(1000),
  maxDelay: z.number().positive().default(30000),
});

export type ReconnectConfig = z.input<typeof ReconnectConfigSchema>;

export const SyncProtocolConfigSchema = z.object({
  wsUrl: z.string().url(),
  httpUrl: z.string().url(),
  reconnect: ReconnectConfigSchema.optional().default({}),
  httpPollInterval: z.number().positive().default(5000),
});

export type SyncProtocolConfig = z.input<typeof SyncProtocolConfigSchema>;

type SyncProtocolConfigParsed = z.output<typeof SyncProtocolConfigSchema>;

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'http_fallback';

export interface IWebSocket {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  onerror: ((error: unknown) => void) | null;
}

export type WebSocketFactory = (url: string) => IWebSocket;

export type MessageHandler = (message: SyncMessage) => void;

export class SyncProtocol {
  private readonly config: SyncProtocolConfigParsed;
  private connectionState: ConnectionState = 'disconnected';
  private ws: IWebSocket | null = null;
  private readonly messageHandlers: Set<MessageHandler> = new Set();
  private readonly messageQueue: SyncMessage[] = [];
  private retryCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private wsFactory: WebSocketFactory | null = null;
  private httpSender: ((message: SyncMessage) => Promise<void>) | null = null;

  constructor(config: SyncProtocolConfig) {
    this.config = SyncProtocolConfigSchema.parse(config);
  }

  setWebSocketFactory(factory: WebSocketFactory): void {
    this.wsFactory = factory;
  }

  setHttpSender(sender: (message: SyncMessage) => Promise<void>): void {
    this.httpSender = sender;
  }

  connect(): void {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return;
    }
    this.connectionState = 'connecting';
    this.attemptWebSocketConnection();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
    this.connectionState = 'disconnected';
    this.retryCount = 0;
  }

  send(message: SyncMessage): void {
    const validated = SyncMessageSchema.parse(message);
    if (this.connectionState === 'connected' && this.ws) {
      this.ws.send(JSON.stringify(validated));
    } else if (this.connectionState === 'http_fallback' && this.httpSender) {
      void this.httpSender(validated);
    } else {
      this.messageQueue.push(validated);
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getQueuedMessages(): SyncMessage[] {
    return [...this.messageQueue];
  }

  private attemptWebSocketConnection(): void {
    if (!this.wsFactory) {
      this.activateHttpFallback();
      return;
    }

    try {
      this.ws = this.wsFactory(this.config.wsUrl);
    } catch {
      this.handleConnectionFailure();
      return;
    }

    this.ws.onopen = () => {
      this.connectionState = 'connected';
      this.retryCount = 0;
      this.flushQueue();
    };

    this.ws.onmessage = (event: { data: string }) => {
      try {
        const parsed = JSON.parse(event.data) as Record<string, unknown>;
        // Reconstruct Uint8Array from payload if it was serialized
        if (parsed['payload'] && typeof parsed['payload'] === 'object') {
          const payloadObj = parsed['payload'] as Record<string, unknown>;
          if (payloadObj['type'] === 'Buffer' && Array.isArray(payloadObj['data'])) {
            parsed['payload'] = new Uint8Array(payloadObj['data'] as number[]);
          }
        }
        const message = SyncMessageSchema.parse(parsed);
        for (const handler of this.messageHandlers) {
          handler(message);
        }
      } catch {
        // Invalid message, ignore
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.handleConnectionFailure();
    };

    this.ws.onerror = () => {
      // Error will be followed by close event
    };
  }

  private handleConnectionFailure(): void {
    const { maxRetries, baseDelay, maxDelay } = this.config.reconnect;
    if (this.retryCount >= maxRetries) {
      this.activateHttpFallback();
      return;
    }

    this.connectionState = 'reconnecting';
    const delay = Math.min(baseDelay * Math.pow(2, this.retryCount), maxDelay);
    this.retryCount++;

    this.reconnectTimer = setTimeout(() => {
      this.attemptWebSocketConnection();
    }, delay);
  }

  private activateHttpFallback(): void {
    this.connectionState = 'http_fallback';
    this.flushQueue();
    this.startHttpPolling();
  }

  private startHttpPolling(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    this.pollTimer = setTimeout(() => {
      // In a real implementation, this would poll the HTTP endpoint
      if (this.connectionState === 'http_fallback') {
        this.startHttpPolling();
      }
    }, this.config.httpPollInterval);
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      if (this.connectionState === 'connected' && this.ws) {
        this.ws.send(JSON.stringify(message));
      } else if (this.connectionState === 'http_fallback' && this.httpSender) {
        void this.httpSender(message);
      }
    }
  }
}
