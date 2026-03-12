'use client';

import { useState, useEffect, useRef } from 'react';
import { SSE_URL } from '@/lib/api';
import { DailyPool } from '@/types';

interface PoolUpdateData {
  totalAmount: number;
  entryCount: number;
  timeUntilDrawMs: number;
}

export function usePrizePool(initialPool?: DailyPool | null) {
  const [poolTotal, setPoolTotal] = useState(initialPool?.totalAmount ?? 0);
  const [entryCount, setEntryCount] = useState(initialPool?.entryCount ?? 0);
  const [timeUntilDraw, setTimeUntilDraw] = useState(initialPool?.timeUntilDrawMs ?? 0);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilDraw((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // SSE for live pool updates
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = `${SSE_URL}/sse/pool`;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as PoolUpdateData;
          setPoolTotal(data.totalAmount);
          setEntryCount(data.entryCount);
          setTimeUntilDraw(data.timeUntilDrawMs);
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        es.close();
      };
    } catch {
      // SSE not available
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return { poolTotal, entryCount, timeUntilDraw };
}
