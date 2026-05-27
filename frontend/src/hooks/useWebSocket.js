import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL } from '../api/client';

export function useWebSocket({ onMessage, token }) {
  const wsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const onMsgRef = useRef(onMessage);
  onMsgRef.current = onMessage;

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    let ws;
    let retryTimer;
    let alive = true;

    const connect = () => {
      ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        if (token) ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = (e) => {
        try { onMsgRef.current(JSON.parse(e.data)); } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (alive) retryTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      alive = false;
      clearTimeout(retryTimer);
      ws?.close();
    };
  }, [token]);

  return { connected, send };
}
