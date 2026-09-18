'use client';

import { useCallback, useEffect, useState } from 'react';
import { ensureGhost, getGhost, ghostHeaders, type GhostIdentity } from './ghost';

export interface GhostState {
  identity: GhostIdentity | null;
  keys: number | null;
  loading: boolean;
  error: string | null;
}

/**
 * The caller's ghost, plus a fetch wrapper that carries its credential.
 *
 * A ghost is created lazily. Someone reading the Wall never needs one, and
 * minting an identity for a passer-by would be exactly the kind of quiet
 * account-creation this product exists to avoid. It appears the moment they do
 * something that needs a Key balance.
 */
export function useGhost() {
  const [state, setState] = useState<GhostState>({
    identity: null,
    keys: null,
    loading: true,
    error: null,
  });

  // Read localStorage after mount, so the server and client agree on first paint.
  useEffect(() => {
    const existing = getGhost();
    if (!existing) {
      setState({ identity: null, keys: null, loading: false, error: null });
      return;
    }

    setState((prev) => ({ ...prev, identity: existing }));

    let cancelled = false;
    fetch('/api/ghost', { headers: ghostHeaders(existing) })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        setState({
          identity: existing,
          keys: data?.ghost?.keys ?? null,
          loading: false,
          error: null,
        });
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Get the ghost, creating one on first need. */
  const claim = useCallback(async (): Promise<GhostIdentity> => {
    const existing = getGhost();
    if (existing) return existing;

    const identity = await ensureGhost();
    setState((prev) => ({ ...prev, identity }));

    const response = await fetch('/api/ghost', { headers: ghostHeaders(identity) });
    if (response.ok) {
      const data = await response.json();
      setState({ identity, keys: data.ghost.keys, loading: false, error: null });
    }
    return identity;
  }, []);

  /** fetch(), with the ghost credential attached and a ghost created if needed. */
  const authedFetch = useCallback(
    async (input: string, init: RequestInit = {}): Promise<Response> => {
      const identity = await claim();
      return fetch(input, {
        ...init,
        headers: { ...(init.headers ?? {}), ...ghostHeaders(identity) },
      });
    },
    [claim]
  );

  const setKeys = useCallback((keys: number) => {
    setState((prev) => ({ ...prev, keys }));
  }, []);

  const refresh = useCallback(async () => {
    const identity = getGhost();
    if (!identity) return;
    const response = await fetch('/api/ghost', { headers: ghostHeaders(identity) });
    if (response.ok) {
      const data = await response.json();
      setState({ identity, keys: data.ghost.keys, loading: false, error: null });
    }
  }, []);

  return { ...state, claim, authedFetch, setKeys, refresh };
}
