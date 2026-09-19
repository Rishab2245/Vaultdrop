'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { timeAgo } from '@/lib/format';
import { getGhost, ghostHeaders } from '@/lib/ghost';
import { MOODS } from '@/lib/constants';

interface ThreadRow {
  id: string;
  role: 'author' | 'starter';
  closed: boolean;
  messageCount: number;
  lastMessageAt: string;
  secret: { id: string; mood: string; preview: string };
}

export function ThreadList() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const identity = getGhost();
    if (!identity) {
      setHydrated(true);
      return;
    }

    fetch('/api/threads', { headers: ghostHeaders(identity) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setThreads(data?.threads ?? []))
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  if (!hydrated) return <div className="skeleton h-48" aria-label="Loading" />;

  if (threads.length === 0) {
    return (
      <div className="border border-hairline p-10 text-center">
        <p className="font-serif text-read text-chrome">No threads yet.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-label">
          When a record on the Wall is something you have lived through too, reach out. It opens a
          private, encrypted conversation with whoever wrote it - no Keys involved, and neither of
          you ever learns who the other is.
        </p>
        <Link href="/wall" className="cmd cmd-primary mt-5 no-underline">
          Read the wall
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {threads.map((thread) => {
        const mood = MOODS.find((m) => m.id === thread.secret.mood) ?? MOODS[0];
        return (
          <li key={thread.id}>
            <Link
              href={`/threads/${thread.id}`}
              className="block border border-hairline no-underline hover:border-amber"
            >
              <div className="rec-head">
                <span>{mood.code}</span>
                <span>{thread.role === 'author' ? 'THEY REACHED YOU' : 'YOU REACHED THEM'}</span>
                {thread.closed && <span className="text-alert">CLOSED</span>}
                <span className="ml-auto tabular">{thread.messageCount} MSG</span>
                <span>{timeAgo(thread.lastMessageAt)}</span>
              </div>
              <div className="px-3 py-2.5">
                <p className="clamp-2 font-serif text-base leading-relaxed text-body">
                  {thread.secret.preview}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
