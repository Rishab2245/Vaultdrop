'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MOODS } from '@/lib/constants';
import { SecretCard, type WallSecret } from './SecretCard';

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
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow first request overwriting a newer filter's results.
  const requestId = useRef(0);

  const load = useCallback(
    async (nextPage: number, nextSort: Sort, nextMood: string | null, append: boolean) => {
      const id = ++requestId.current;
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ sort: nextSort, page: String(nextPage) });
        if (nextMood) params.set('mood', nextMood);

        const response = await fetch(`/api/wall?${params}`);
        if (!response.ok) throw new Error('Could not load the wall.');

        const data = (await response.json()) as { items: WallSecret[]; hasMore: boolean };
        if (id !== requestId.current) return;

        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setHasMore(data.hasMore);
        setPage(nextPage);
      } catch {
        if (id === requestId.current) setError('Could not load the wall. Try again.');
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    []
  );

  const changeFilter = useCallback(
    (nextSort: Sort, nextMood: string | null) => {
      setSort(nextSort);
      setMood(nextMood);
      void load(0, nextSort, nextMood, false);
    },
    [load]
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-ink-700 bg-ink-850/60 p-1">
          {(['hot', 'new'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => changeFilter(option, mood)}
              aria-pressed={sort === option}
              className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                sort === option ? 'bg-violet text-white' : 'text-chalk-dim hover:text-chalk'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => changeFilter(sort, null)}
            className={`chip ${mood === null ? 'chip-active' : ''}`}
          >
            All
          </button>
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => changeFilter(sort, mood === m.id ? null : m.id)}
              className={`chip ${mood === m.id ? 'chip-active' : ''}`}
            >
              <span aria-hidden="true">{m.glyph}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite" className="space-y-4">
        {items.length === 0 && !loading && (
          <div className="panel p-12 text-center">
            <p className="text-chalk-dim">
              {mood ? 'Nothing here under that mood yet.' : 'The wall is empty.'}
            </p>
            <Link href="/confess" className="btn-primary mt-5">
              Be the first
            </Link>
          </div>
        )}

        {items.map((secret, index) => (
          <SecretCard key={secret.id} secret={secret} priority={index < 3} />
        ))}

        {loading && (
          <div className="space-y-4" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-40" />
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-6 text-center text-sm text-ember">{error}</p>}

      {hasMore && !loading && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => void load(page + 1, sort, mood, true)}
            className="btn-ghost"
          >
            Read more
          </button>
        </div>
      )}
    </div>
  );
}
