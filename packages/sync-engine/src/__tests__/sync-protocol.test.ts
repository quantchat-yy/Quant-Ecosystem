import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncProtocol, SyncMessageSchema } from '../sync-protocol.js';
import type { IWebSocket, SyncMessage, WebSocketFactory } from '../sync-protocol.js';

function createMockWebSocket(): IWebSocket & {
  triggerOpen: () => void;
  triggerMessage: (data: string) => void;
  triggerClose: () => void;
  triggerError: () => void;
} {
  const ws: IWebSocket & {
    triggerOpen: () => void;
    triggerMessage: (data: string) => void;
    triggerClose: () => void;
    triggerError: () => void;
  } = {
    send: vi.fn(),
    close: vi.fn(),
    onopen: null,
    onmessage: null,
    onclose: null,
    onerror: null,
    triggerOpen() {
      if (this.onopen) this.onopen();
    },
    triggerMessage(data: string) {
      if (this.onmessage) this.onmessage({ data });
    },
    triggerClose() {
      if (this.onclose) this.onclose();
    },
    triggerError() {
      if (this.onerror) this.onerror(new Error('mock error'));
    },
  };
  return ws;
}

describe('SyncProtocol', () => {
  let protocol: SyncProtocol;

  beforeEach(() => {
    vi.useFakeTimers();
    protocol = new SyncProtocol({
      wsUrl: 'wss://example.com/sync',
      httpUrl: 'https://example.com/sync',
      reconnect: { maxRetries: 3, baseDelay: 100, maxDelay: 1000 },
    });
  });

  afterEach(() => {
    protocol.disconnect();
    vi.useRealTimers();
  });

  it('should start in disconnected state', () => {
    expect(protocol.getConnectionState()).toBe('disconnected');
  });

  it('should connect via WebSocket', () => {
    const mockWs = createMockWebSocket();
    const factory: WebSocketFactory = vi.fn(() => mockWs);
    protocol.setWebSocketFactory(factory);

    protocol.connect();
    expect(protocol.getConnectionState()).toBe('connecting');

    mockWs.triggerOpen();
    expect(protocol.getConnectionState()).toBe('connected');
  });

  it('should disconnect cleanly', () => {
    const mockWs = createMockWebSocket();
    protocol.setWebSocketFactory(() => mockWs);
    protocol.connect();
    mockWs.triggerOpen();

    protocol.disconnect();
    expect(protocol.getConnectionState()).toBe('disconnected');
    expect(mockWs.close).toHaveBeenCalled();
  });

  it('should queue messages when not connected', () => {
    const message: SyncMessage = {
      type: 'update',
      documentId: 'doc1',
      payload: new Uint8Array([1, 2, 3]),
      timestamp: Date.now(),
      messageId: 'msg-1',
    };

    protocol.send(message);
    expect(protocol.getQueuedMessages()).toHaveLength(1);
  });

  it('should flush queued messages on connect', () => {
    const mockWs = createMockWebSocket();
    protocol.setWebSocketFactory(() => mockWs);

    const message: SyncMessage = {
      type: 'update',
      documentId: 'doc1',
      timestamp: Date.now(),
      messageId: 'msg-1',
    };

    protocol.send(message);
    expect(protocol.getQueuedMessages()).toHaveLength(1);

    protocol.connect();
    mockWs.triggerOpen();

    expect(protocol.getQueuedMessages()).toHaveLength(0);
    expect(mockWs.send).toHaveBeenCalled();
  });

  it('should reconnect with exponential backoff', () => {
    const mockWs = createMockWebSocket();
    let callCount = 0;
    const factory: WebSocketFactory = () => {
      callCount++;
      return mockWs;
    };
    protocol.setWebSocketFactory(factory);

    protocol.connect();
    expect(callCount).toBe(1);

    // Simulate connection failure
    mockWs.triggerClose();
    expect(protocol.getConnectionState()).toBe('reconnecting');

    // First retry after 100ms
    vi.advanceTimersByTime(100);
    expect(callCount).toBe(2);

    // Fail again
    mockWs.triggerClose();
    // Second retry after 200ms
    vi.advanceTimersByTime(200);
    expect(callCount).toBe(3);
  });

  it('should activate HTTP fallback after max retries', () => {
    const mockWs = createMockWebSocket();
    protocol.setWebSocketFactory(() => mockWs);

    protocol.connect();
    // Exhaust all retries (maxRetries = 3)
    mockWs.triggerClose(); // retry 1
    vi.advanceTimersByTime(100);
    mockWs.triggerClose(); // retry 2
    vi.advanceTimersByTime(200);
    mockWs.triggerClose(); // retry 3
    vi.advanceTimersByTime(400);
    mockWs.triggerClose(); // exceeded

    expect(protocol.getConnectionState()).toBe('http_fallback');
  });

  it('should fall back to HTTP when no WebSocket factory is set', () => {
    protocol.connect();
    expect(protocol.getConnectionState()).toBe('http_fallback');
  });

  it('should receive and dispatch messages', () => {
    const mockWs = createMockWebSocket();
    protocol.setWebSocketFactory(() => mockWs);

    const handler = vi.fn();
    protocol.onMessage(handler);

    protocol.connect();
    mockWs.triggerOpen();

    const message: SyncMessage = {
      type: 'ack',
      documentId: 'doc1',
      timestamp: 12345,
      messageId: 'msg-ack-1',
    };

    mockWs.triggerMessage(JSON.stringify(message));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]![0].type).toBe('ack');
  });

  it('should validate message schema with Zod', () => {
    expect(() =>
      SyncMessageSchema.parse({
        type: 'update',
        documentId: 'doc1',
        timestamp: 123,
        messageId: 'msg-1',
      }),
    ).not.toThrow();

    expect(() =>
      SyncMessageSchema.parse({
        type: 'invalid_type',
        documentId: 'doc1',
        timestamp: 123,
        messageId: 'msg-1',
      }),
    ).toThrow();

    expect(() =>
      SyncMessageSchema.parse({
        type: 'update',
        documentId: '',
        timestamp: 123,
        messageId: 'msg-1',
      }),
    ).toThrow();
  });
});
