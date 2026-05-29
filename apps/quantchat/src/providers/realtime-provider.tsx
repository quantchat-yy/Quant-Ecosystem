'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { WebSocketClient } from '@quant/realtime';
import type { ClientState, EventHandler } from '@quant/realtime';
import { getAuthToken } from '../lib/auth';
import { RealtimeContext } from './realtime-context';
import type { RealtimeContextValue } from './realtime-context';

export { useRealtime } from './realtime-context';

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<WebSocketClient | null>(null);
  const [connectionState, setConnectionState] = useState<ClientState>('disconnected');

  useEffect(() => {
    const token = getAuthToken() || '';
    const url = process.env.NEXT_PUBLIC_WS_URL || 'wss://chat.quant.app/ws';

    const client = new WebSocketClient(
      {
        url,
        token,
        app: 'quantchat' as any,
        autoReconnect: true,
      },
      {
        onConnect: () => setConnectionState('connected'),
        onDisconnect: () => setConnectionState('disconnected'),
        onReconnecting: () => setConnectionState('reconnecting'),
      },
    );

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  const subscribe = useCallback((channel: string, handler: EventHandler) => {
    if (clientRef.current) {
      return clientRef.current.subscribe(channel, handler);
    }
    return () => {};
  }, []);

  const publish = useCallback((channel: string, payload: unknown) => {
    if (clientRef.current) {
      clientRef.current.publish(channel, payload);
    }
  }, []);

  const value: RealtimeContextValue = {
    client: clientRef.current,
    connectionState,
    isConnected: connectionState === 'connected',
    subscribe,
    publish,
  };

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}
