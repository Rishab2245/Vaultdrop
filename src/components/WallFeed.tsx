'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MOODS } from '@/lib/constants';
import { getGhost, ghostHeaders } from '@/lib/ghost';
import { SecretCard, type WallSecret } from './SecretCard';
import { LockedRecord, type LockedSecret } from './LockedRecord';

type Sort = 'hot' | 'new' | 'price';

const SORTS: { id: Sort; label: string; hint: string }[] = [
  { id: 'hot', label: 'Hot', hint: 'Recent and reacted to' },
  { id: 'new', label: 'New', hint: 'Latest first' },
  { id: 'price', label: 'Dearest', hint: 'Sealed records, highest price first' },
];

/** How often to look for records filed since this page loaded. */
const POLL_MS = 45_000;

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
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Records filed since the page loaded, held back until the reader asks. */
  const [arrivals, setArrivals] = useState<WallSecret[]>([]);

  // Guards against a slow request overwriting a newer filter's results.
  const requestId = useRef(0);
  const newestSeen = useRef<string | null>(initialItems[0]?.createdAt ?? null);

  const load = useCallback(
    async (
      nextPage: number,
      nextSort: Sort,
      nextMood: string | null,
      append: boolean,
      nextSealed: boolean,
      nextQuery: string
    ) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ sort: nextSort, page: String(nextPage) });
        if (nextMood) params.set('mood', nextMood);
        if (nextSealed) params.set('locked', '1');
        if (nextQuery) params.set('q', nextQuery);

        const response = await fetch(`/api/wall?${params}`, { headers: ghostHeaders(getGhost()) });
        if (!response.ok) throw new Error('Could not load the wall.');

        const data = (await response.json()) as { items: WallSecret[]; hasMore: boolean };
        if (id !== requestId.current) return;

        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMore(data.hasMore);
        setPage(nextPage);
        if (!append && data.items[0]) newestSeen.current = data.items[0].createdAt;
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
    void load(0, 'hot', null, false, false, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Poll for records filed since the newest one on screen.
   *
   * New arrivals are counted, not injected. A page that rewrites itself while
   * you are halfway through reading a confession is worse than a button, and
   * this is a page people read slowly.
   *
   * Paused while the tab is hidden, and only on the default view: a
   * backgrounded tab polling forever is how a free tier turns into a bill.
   */
  useEffect(() => {
    if (query || sealedOnly || mood || sort !== 'hot') return;

    let cancelled = false;

    const check = async () => {
      if (document.hidden || !newestSeen.current) return;
      try {
        const params = new URLSearchParams({ sort: 'new', since: newestSeen.current });
        const response = await fetch(`/api/wall?${params}`, { headers: ghostHeaders(getGhost()) });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { items: WallSecret[] };
        if (data.items.length > 0) setArrivals(data.items);
      } catch {
        /* a failed poll is not worth telling anyone about */
      }
    };

    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [mood, query, sealedOnly, sort]);

  const showArrivals = useCallback(() => {
    setItems((prev) => {
      const known = new Set(prev.map((p) => p.id));
      return [...arrivals.filter((a) => !known.has(a.id)), ...prev];
    });
    if (arrivals[0]) newestSeen.current = arrivals[0].createdAt;
    setArrivals([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [arrivals]);

  const changeFilter = useCallback(
    (next: Partial<{ sort: Sort; mood: string | null; sealed: boolean; q: string }>) => {
      const s = next.sort ?? sort;
      const m = next.mood !== undefined ? next.mood : mood;
      const sealed = next.sealed ?? sealedOnly;
      const q = next.q !== undefined ? next.q : query;

      setSort(s);
      setMood(m);
      setSealedOnly(sealed);
      setQuery(q);
      void load(0, s, m, false, sealed, q);
    },
    [load, mood, query, sealedOnly, sort]
  );

  // Coalesce typing into one request per pause rather than one per keystroke.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        void load(0, sort, mood, false, sealedOnly, value.trim());
      }, 350);
    },
    [load, mood, sealedOnly, sort]
  );

  return (
    <div>
      <div className="mb-4 border border-hairline">
        {/* ---- search ---- */}
        <div className="flex items-center gap-2 border-b border-hairline px-2 py-1.5">
          <span className="field">Find</span>
          <label htmlFor="wall-search" className="sr-only">
            Search the wall
          </label>
          <input
            id="wall-search"
            type="text"
            value={query}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="A word, or a classification like REGRET"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-base text-chrome placeholder:text-label focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => changeFilter({ q: '' })}
              className="cmd-bare"
              aria-label="Clear search"
            >
              CLEAR
            </button>
          )}
        </div>

        {/* ---- sort ---- */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-hairline bg-panel px-2 py-1">
          <span className="field">Sort</span>
          {SORTS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => changeFilter({ sort: option.id })}
              aria-pressed={sort === option.id}
              title={option.hint}
              className={`text-2xs uppercase tracking-[0.1em] ${
                sort === option.id ? 'text-amber' : 'text-label hover:text-chrome'
              }`}
            >
              {option.label}
            </button>
          ))}

          <span className="field ml-auto">Show</span>
          <button
            type="button"
            onClick={() => changeFilter({ sealed: !sealedOnly })}
            aria-pressed={sealedOnly}
            className={`text-2xs uppercase tracking-[0.1em] ${
              sealedOnly ? 'text-amber' : 'text-label hover:text-chrome'
            }`}
          >
            Sealed only
          </button>
        </div>

        {/* ---- classification ---- */}
        <div className="flex flex-wrap items-center gap-1 px-2 py-1.5">
          <span className="field mr-1">Class</span>
          <button
            type="button"
            onClick={() => changeFilter({ mood: null })}
            aria-pressed={mood === null}
            className="tag"
          >
            All
          </button>
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => changeFilter({ mood: mood === m.id ? null : m.id })}
              aria-pressed={mood === m.id}
              className="tag"
              title={m.label}
            >
              {m.code}
            </button>
          ))}
        </div>
      </div>

      {/* ---- new arrivals ---- */}
      {arrivals.length > 0 && (
        <button
          type="button"
          onClick={showArrivals}
          className="mb-2 w-full border border-amber px-3 py-2 text-2xs uppercase tracking-[0.12em] text-amber hover:bg-amber hover:text-void"
        >
          {arrivals.length} new {arrivals.length === 1 ? 'record' : 'records'} · show
        </button>
      )}

      <div aria-live="polite" className="space-y-2">
        {items.length === 0 && !loading && (
          <div className="border border-hairline px-4 py-12 text-center">
            <p className="text-sm text-label">
              {query
                ? `Nothing matches "${query}".`
                : sealedOnly
                  ? 'No sealed records yet. Seal one and set a price.'
                  : mood
                    ? 'No records match that classification.'
                    : 'No records.'}
            </p>
            {query ? (
              <button type="button" onClick={() => changeFilter({ q: '' })} className="cmd mt-4">
                Clear the search
              </button>
            ) : (
              <Link href="/confess" className="cmd cmd-primary mt-4 no-underline">
                File the first
              </Link>
            )}
          </div>
        )}

        {items.map((secret) =>
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
            onClick={() => void load(page + 1, sort, mood, true, sealedOnly, query)}
            className="cmd"
          >
            Load more
          </button>
        </div>
      )}

      {query && (
        <p className="mt-4 text-center text-2xs uppercase tracking-[0.1em] text-label">
          Search covers public records, teasers and classifications &mdash; never a sealed body
        </p>
      )}
    </div>
  );
}
