'use client';

import { useState, useEffect, useRef } from 'react';
import { SSE_URL } from '@/lib/api';

interface LiveVoteData {
  secretId: string;
  voteCount: number;
  rankScore: number;
}

export function useLiveVotes(secretId: string, initialCount: number = 0) {
  const [voteCount, setVoteCount] = useState(initialCount);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!secretId || typeof window === 'undefined') return;

    const url = `${SSE_URL}/sse/votes/${secretId}`;

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as LiveVoteData;
          if (data.secretId === secretId) {
            setVoteCount(data.voteCount);
          }
        } catch {
          // Ignore parse errors
        }
      };

      es.onerror = () => {
        // Silently fail - SSE is optional enhancement
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
  }, [secretId]);

  return voteCount;
}
