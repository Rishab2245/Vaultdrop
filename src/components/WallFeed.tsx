'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MOODS } from '@/lib/constants';
import { getGhost, ghostHeaders } from '@/lib/ghost';
import { SecretCard, type WallSecret } from './SecretCard';
import { LockedRecord, type LockedSecret } from './LockedRecord';

type Sort = 'hot' | 'new';

export function WallFeed({
  initialItems,
  initialHasMore,
}: {
  initialItems: WallSecret[];
  initialHasMore: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [sort, setSort] = useState<Sort>('hot');
  const [mood, setMood] = useState<string | null>(null);
  const [sealedOnly, setSealedOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow first request overwriting a newer filter's results.
  const requestId = useRef(0);

  const load = useCallback(
    async (
      nextPage: number,
      nextSort: Sort,
      nextMood: string | null,
      append: boolean,
      nextSealed = false
    ) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ sort: nextSort, page: String(nextPage) });
        if (nextMood) params.set('mood', nextMood);
        if (nextSealed) params.set('locked', '1');

        // Carrying the ghost lets the API mark records this visitor has already
        // paid to open. Without it they would be told to buy them again.
        const response = await fetch(`/api/wall?${params}`, {
          headers: ghostHeaders(getGhost()),
        });
        if (!response.ok) throw new Error('Could not load the wall.');

        const data = (await response.json()) as { items: WallSecret[]; hasMore: boolean };
        if (id !== requestId.current) return;

        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch {
        if (id === requestId.current) setError('Query failed. Retry.');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    []
  );

  // The server render cannot know who is looking, so it seals every locked
  // record. If this browser has a ghost, ask again as that ghost.
  useEffect(() => {
    if (!getGhost()) return;
    if (!initialItems.some((item) => item.isLocked)) return;
    void load(0, 'hot', null, false);
    // Runs once on mount; later loads go through changeFilter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeFilter = useCallback(
    (nextSort: Sort, nextMood: string | null, nextSealed = sealedOnly) => {
      setSort(nextSort);
      setMood(nextMood);
      setSealedOnly(nextSealed);
      void load(0, nextSort, nextMood, false, nextSealed);
    },
    [load, sealedOnly]
  );

  return (
    <div>
      {/* The filter row is a query bar, so it states the query rather than
          offering pills that could belong to any feed. */}
      <div className="mb-4 border border-hairline">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline bg-panel px-2 py-1">
          <span className="field">Sort</span>
          {(['hot', 'new'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeFilter(option, mood)}
              aria-pressed={sort === option}
              className={`text-2xs uppercase tracking-[0.1em] ${
                sort === option ? 'text-amber' : 'text-label hover:text-chrome'
              }`}
            >
              {option}
            </button>
          ))}

          <span className="field ml-auto">Show</span>
          <button
            type="button"
            onClick={() => changeFilter(sort, mood, !sealedOnly)}
            aria-pressed={sealedOnly}
            className={`text-2xs uppercase tracking-[0.1em] ${
              sealedOnly ? 'text-amber' : 'text-label hover:text-chrome'
            }`}
          >
            Sealed only
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
          <span className="field mr-1">Class</span>
          <button
            type="button"
            onClick={() => changeFilter(sort, null)}
            aria-pressed={mood === null}
            className="tag"
          >
            All
          </button>
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => changeFilter(sort, mood === m.id ? null : m.id)}
              aria-pressed={mood === m.id}
              className="tag"
              title={m.label}
            >
              {m.code}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="space-y-2">
        {items.length === 0 && !loading && (
          <div className="border border-hairline px-4 py-12 text-center">
            <p className="text-sm text-label">
              {sealedOnly
                ? 'No sealed records yet. Seal one and set a price.'
                : mood
                  ? 'No records match that classification.'
                  : 'No records.'}
            </p>
            <Link href="/confess" className="cmd-primary mt-4 no-underline">
              File the first
            </Link>
          </div>
        )}

        {items.map((secret) =>
          // A locked record has no body in this payload at all, so it gets the
          // component that knows how to buy one.
          secret.isLocked && !secret.unlocked ? (
            <LockedRecord key={secret.id} secret={secret as unknown as LockedSecret} />
          ) : (
            <SecretCard key={secret.id} secret={secret} />
          )
        )}

        {loading && (
          <div className="space-y-2" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-28" />
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-alert">
          {error}
        </p>
      )}

      {hasMore && !loading && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() => void load(page + 1, sort, mood, true, sealedOnly)}
            className="cmd"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
