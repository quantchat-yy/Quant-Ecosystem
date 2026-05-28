// ============================================================================
// QuantChat - WebSocket Client
// Real-time message handling, presence, typing indicators
// ============================================================================

import type { WSEvent, WSEventType, Message, TypingIndicator } from '../types';
import { logger } from '@quant/common';

// ============================================================================
// Types
// ============================================================================

type EventHandler = (payload: unknown) => void;

interface WebSocketConfig {
  url: string;
  token: string;
  deviceId: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'failed';

// ============================================================================
// WebSocket Client
// ============================================================================

export class QuantChatWSClient {
  private config: WebSocketConfig;
  private socket: WebSocket | null = null;
  private handlers: Map<WSEventType, EventHandler[]> = new Map();
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WSEvent[] = [];
  private onStateChange?: (state: ConnectionState) => void;

  constructor(config: Partial<WebSocketConfig> = {}) {
    this.config = {
      url: config.url || 'wss://chat.quant.app/ws',
      token: config.token || '',
      deviceId: config.deviceId || `device_${Date.now().toString(36)}`,
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 15000,
    };
  }

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  connect(token?: string): void {
    if (token) this.config.token = token;
    if (!this.config.token) {
      throw new Error('Authentication token is required');
    }

    this.setState('connecting');
    const url = `${this.config.url}?token=${encodeURIComponent(this.config.token)}&deviceId=${this.config.deviceId}`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = () => {
        this.setState('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.flushMessageQueue();
      };

      this.socket.onmessage = (event) => {
        try {
          const wsEvent = JSON.parse(event.data) as WSEvent;
          this.dispatchEvent(wsEvent);
        } catch {
          // Invalid message format
        }
      };

      this.socket.onclose = (event) => {
        this.stopHeartbeat();
        if (event.code !== 1000) {
          this.handleDisconnect();
        } else {
          this.setState('disconnected');
        }
      };

      this.socket.onerror = () => {
        this.handleDisconnect();
      };
    } catch {
      this.handleDisconnect();
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    this.stopReconnect();
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    this.setState('disconnected');
  }

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  on(eventType: WSEventType, handler: EventHandler): () => void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler);
    this.handlers.set(eventType, handlers);

    // Return unsubscribe function
    return () => {
      const current = this.handlers.get(eventType) || [];
      this.handlers.set(
        eventType,
        current.filter((h) => h !== handler),
      );
    };
  }

  off(eventType: WSEventType, handler?: EventHandler): void {
    if (handler) {
      const current = this.handlers.get(eventType) || [];
      this.handlers.set(
        eventType,
        current.filter((h) => h !== handler),
      );
    } else {
      this.handlers.delete(eventType);
    }
  }

  private dispatchEvent(event: WSEvent): void {
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        handler(event.payload);
      } catch (error) {
        logger.error(`[WS] Handler error for ${event.type}:`, error);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Sending Events
  // --------------------------------------------------------------------------

  send(event: WSEvent): void {
    if (this.state === 'connected' && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(event));
    } else {
      this.messageQueue.push(event);
    }
  }

  sendTypingStart(conversationId: string): void {
    this.send({
      type: 'typing:start',
      payload: { conversationId },
      timestamp: Date.now(),
    });
  }

  sendTypingStop(conversationId: string): void {
    this.send({
      type: 'typing:stop',
      payload: { conversationId },
      timestamp: Date.now(),
    });
  }

  sendMessageRead(conversationId: string, messageIds: string[]): void {
    this.send({
      type: 'message:read',
      payload: { conversationId, messageIds },
      timestamp: Date.now(),
    });
  }

  sendPresenceUpdate(status: 'online' | 'away'): void {
    this.send({
      type: 'presence:update',
      payload: { status },
      timestamp: Date.now(),
    });
  }

  // --------------------------------------------------------------------------
  // Convenience Handlers
  // --------------------------------------------------------------------------

  onMessage(handler: (message: Message) => void): () => void {
    return this.on('message:new', handler as EventHandler);
  }

  onMessageUpdate(handler: (message: Message) => void): () => void {
    return this.on('message:update', handler as EventHandler);
  }

  onMessageDelete(
    handler: (data: { messageId: string; conversationId: string }) => void,
  ): () => void {
    return this.on('message:delete', handler as EventHandler);
  }

  onTyping(
    handler: (data: { userId: string; conversationId: string; isTyping: boolean }) => void,
  ): () => void {
    const unsub1 = this.on('typing:start', (payload) => {
      const data = payload as { userId: string; conversationId: string };
      handler({ ...data, isTyping: true });
    });
    const unsub2 = this.on('typing:stop', (payload) => {
      const data = payload as { userId: string; conversationId: string };
      handler({ ...data, isTyping: false });
    });
    return () => {
      unsub1();
      unsub2();
    };
  }

  onPresence(handler: (data: { userId: string; status: string }) => void): () => void {
    return this.on('presence:update', handler as EventHandler);
  }

  onIncomingCall(
    handler: (data: { callId: string; callerId: string; type: string }) => void,
  ): () => void {
    return this.on('call:incoming', handler as EventHandler);
  }

  onSnapReceived(handler: (data: { snapId: string; senderId: string }) => void): () => void {
    return this.on('snap:received', handler as EventHandler);
  }

  onStreakWarning(
    handler: (data: { friendId: string; count: number; hoursLeft: number }) => void,
  ): () => void {
    return this.on('streak:warning', handler as EventHandler);
  }

  onNotification(
    handler: (data: { id: string; type: string; title: string; body: string }) => void,
  ): () => void {
    return this.on('notification:new', handler as EventHandler);
  }

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected';
  }

  setStateChangeHandler(handler: (state: ConnectionState) => void): void {
    this.onStateChange = handler;
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  private setState(state: ConnectionState): void {
    this.state = state;
    this.onStateChange?.(state);
  }

  private handleDisconnect(): void {
    this.setState('reconnecting');
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1);
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      this.setState('failed');
    }
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({
        type: 'presence:update',
        payload: { status: 'online' },
        timestamp: Date.now(),
      });
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private flushMessageQueue(): void {
    const queue = [...this.messageQueue];
    this.messageQueue = [];
    for (const event of queue) {
      this.send(event);
    }
  }
}

export const wsClient = new QuantChatWSClient();
