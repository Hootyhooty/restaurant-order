import { useEffect } from 'react';
import { API_BASE } from '../apiConfig';

/**
 * Subscribe to kitchen SSE stream; calls onEvent when queue/stock changes.
 */
export function useKitchenStream(token, onEvent) {
  useEffect(() => {
    if (!token || typeof onEvent !== 'function') return undefined;

    const url = `${API_BASE}/api/kitchen/stream`;
    const controller = new AbortController();

    const connect = async () => {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';
          for (const part of parts) {
            const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine) continue;
            try {
              const payload = JSON.parse(dataLine.slice(6));
              if (payload.type && payload.type !== 'connected') {
                onEvent(payload);
              }
            } catch {
              /* ignore malformed chunks */
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          /* stream will reconnect on next mount / token change */
        }
      }
    };

    connect();
    return () => controller.abort();
  }, [token, onEvent]);
}
