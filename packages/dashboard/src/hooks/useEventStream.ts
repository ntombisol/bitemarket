import { useState, useEffect, useRef, useCallback } from "react";

export interface FlowEvent {
  id: string;
  timestamp: number;
  type:
    | "query_received"
    | "query_decrypted"
    | "seller_processing"
    | "response_encrypted"
    | "payment_required"
    | "payment_confirmed"
    | "data_delivered";
  data: Record<string, unknown>;
}

export function useEventStream() {
  const [events, setEvents] = useState<FlowEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const connect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    const source = new EventSource("/events");
    sourceRef.current = source;

    source.onopen = () => setIsConnected(true);

    source.onmessage = (e) => {
      try {
        const event: FlowEvent = JSON.parse(e.data);
        setEvents((prev) => {
          // Deduplicate by id
          if (prev.some((p) => p.id === event.id)) return prev;
          const next = [...prev, event];
          return next.slice(-200); // Keep last 200
        });
      } catch {
        // skip malformed events
      }
    };

    source.onerror = () => {
      setIsConnected(false);
      source.close();
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      sourceRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  const clearEvents = useCallback(() => setEvents([]), []);

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;

  return { events, latestEvent, isConnected, clearEvents };
}
