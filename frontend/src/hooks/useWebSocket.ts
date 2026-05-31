import { useEffect, useRef, useState } from 'react';

export const ReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
} as const;

export type ReadyState = (typeof ReadyState)[keyof typeof ReadyState];

interface UseWebSocketOptions {
  onMessage?: (event: MessageEvent) => void;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  shouldReconnect?: () => boolean;
}

interface UseWebSocketReturn {
  readyState: ReadyState;
  sendJsonMessage: (data: unknown) => void;
}

/**
 * Minimal WebSocket hook tailored for React 19 + Compiler.
 *
 * The consumer's callbacks are expected to be stable (React Compiler auto-memoizes
 * function references inside compiled components). They are stored on a ref so the
 * effect can synchronise with the WebSocket lifecycle without tearing the socket
 * down on every render.
 */
export function useWebSocket(url: string | null, options: UseWebSocketOptions): UseWebSocketReturn {
  const [connectionState, setConnectionState] = useState<ReadyState>(ReadyState.CONNECTING);
  const socketRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  // Keep latest callbacks on a ref so the WebSocket lifecycle effect can call them
  // without depending on options identity (which would tear down the socket each render).
  // eslint-disable-next-line react-hooks/refs
  optionsRef.current = options;

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let attempts = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (cancelled) return;

      setConnectionState(ReadyState.CONNECTING);
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        if (cancelled) return;
        attempts = 0;
        setConnectionState(ReadyState.OPEN);
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        optionsRef.current.onMessage?.(event);
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnectionState(ReadyState.CLOSED);
        socketRef.current = null;

        const {
          shouldReconnect = () => false,
          reconnectInterval = 3000,
          reconnectAttempts = 10,
        } = optionsRef.current;

        if (shouldReconnect() && attempts < reconnectAttempts) {
          attempts += 1;
          reconnectTimer = setTimeout(connect, reconnectInterval);
        }
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      const ws = socketRef.current;
      socketRef.current = null;
      if (ws && ws.readyState === ReadyState.OPEN) {
        ws.close();
      }
    };
  }, [url]);

  const readyState: ReadyState = url ? connectionState : ReadyState.CLOSED;

  const sendJsonMessage = (data: unknown) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === ReadyState.OPEN) {
      ws.send(JSON.stringify(data));
    }
  };

  return { readyState, sendJsonMessage };
}
