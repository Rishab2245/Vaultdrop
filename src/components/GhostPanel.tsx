'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ECONOMY, LEDGER_LABELS, standingOf, worthItRate, type LedgerReason } from '@/lib/economy';
import { encodeRecoveryKey, ghostHeaders, getGhost, restoreGhost } from '@/lib/ghost';
import { timeAgo } from '@/lib/format';
import { useGhost } from '@/lib/use-ghost';
import { CopyField } from './CopyField';

interface LedgerRow {
  id: string;
  delta: number;
  balance: number;
  reason: string;
  createdAt: string;
}

interface Me {
  ghost: {
    codename: string;
    keys: number;
    opensReceived: number;
    worthItCount: number;
    notWorthCount: number;
    createdAt: string;
  };
  records: number;
  openThreads: number;
  ledger: LedgerRow[];
}

export function GhostPanel() {
  const { identity, claim } = useGhost();
  const [me, setMe] = useState<Me | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const existing = getGhost();
    if (!existing) {
      setHydrated(true);
      return;
    }
    try {
      const response = await fetch('/api/ghost', { headers: ghostHeaders(existing) });
      if (response.ok) setMe(await response.json());
    } catch {
      /* the panel degrades to the empty state */
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRestore = useCallback(async () => {
    setError(null);
    setRestoring(true);
    try {
      await restoreGhost(restoreInput);
      setRestoreInput('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore that ghost.');
    } finally {
      setRestoring(false);
    }
  }, [load, restoreInput]);

  if (!hydrated) return <div className="skeleton h-64" aria-label="Loading" />;

  if (!me) {
    return (
      <div className="space-y-4">
        <div className="border border-hairline p-6 text-center">
          <p className="font-serif text-read text-chrome">This browser has no ghost yet.</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-label">
            A ghost is the minimum needed to hold Keys and a reputation. It is not an account:
            no email, no password, no phone number. It appears the first time you file or open
            something.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await claim();
                await load();
              }}
              className="cmd cmd-primary"
            >
              Create one now
            </button>
            <Link href="/confess" className="cmd no-underline">
              Or just file something
            </Link>
          </div>
        </div>

        <RestoreBox
          value={restoreInput}
          onChange={setRestoreInput}
          onRestore={onRestore}
          busy={restoring}
          error={error}
        />
      </div>
    );
  }

  const { ghost } = me;
  const rate = worthItRate(ghost.worthItCount, ghost.notWorthCount);
  const standing = standingOf(ghost.worthItCount, ghost.notWorthCount);

  return (
    <div className="space-y-4">
      {/* ---- identity ---- */}
      <div className="rec">
        <div className="rec-head">
          <span>IDENTITY</span>
          <span className="ml-auto">{timeAgo(ghost.createdAt).toUpperCase()} OLD</span>
        </div>
        <div className="rec-body">
          <p className="font-serif text-[1.6rem] leading-tight text-chrome">{ghost.codename}</p>
          <p className="mt-2 text-sm leading-relaxed text-label">
            Derived from your key, not chosen. Nobody can take it, squat it, or work out who is
            behind it.
          </p>
        </div>
        <div className="rec-foot">
          <span className="tabular text-amber">{ghost.keys} KEYS</span>
          <span className="tabular">{me.records} FILED</span>
          <span className="tabular">{ghost.opensReceived} OPENED</span>
          <span
            className={`ml-auto ${
              standing === 'TRUSTED' ? 'text-sealed' : standing === 'POOR' ? 'text-alert' : ''
            }`}
          >
            {standing}
            {rate !== null && ` · ${rate}%`}
          </span>
        </div>
      </div>

      {/* ---- how to earn ---- */}
      <div className="border border-hairline">
        <div className="border-b border-hairline bg-panel px-2 py-1">
          <span className="field">How Keys move</span>
        </div>
        <div className="scroll overflow-x-auto">
          <table className="w-full">
            <tbody className="text-sm">
              {[
                ['Every day you visit', `+${ECONOMY.dailyGrant}`],
                ['File an original public record', `+${ECONOMY.fileReward}`],
                ['Someone opens your sealed record', 'held in escrow'],
                ['They confirm it was worth it', '+ the full price'],
                ['They say it was not', 'you get nothing'],
                ['Open a sealed record', `−${ECONOMY.minPrice} to −${ECONOMY.maxPrice}`],
              ].map(([label, value]) => (
                <tr key={label} className="border-b border-hairline last:border-0">
                  <td className="px-2 py-1.5 text-body">{label}</td>
                  <td className="px-2 py-1.5 text-right tabular text-chrome">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-hairline px-2 py-1.5">
          <p className="text-sm text-label">
            Keys are not money and cannot be cashed out. That is deliberate: a platform that pays
            cash for secrets gets invented ones.
          </p>
        </div>
      </div>

      {me.openThreads > 0 && (
        <Link href="/threads" className="block border border-hairline no-underline hover:border-amber">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="font-serif text-read text-chrome">
              {me.openThreads} open {me.openThreads === 1 ? 'thread' : 'threads'}
            </span>
            <span className="text-2xs uppercase tracking-[0.1em] text-amber">Read →</span>
          </div>
        </Link>
      )}

      {/* ---- ledger ---- */}
      <div className="border border-hairline">
        <div className="border-b border-hairline bg-panel px-2 py-1">
          <span className="field">Key history</span>
        </div>
        {me.ledger.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-label">Nothing yet.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {me.ledger.map((row) => (
              <li key={row.id} className="flex items-center gap-3 px-2 py-1.5 text-sm">
                <span className={`tabular w-10 ${row.delta > 0 ? 'text-sealed' : 'text-alert'}`}>
                  {row.delta > 0 ? '+' : ''}
                  {row.delta}
                </span>
                <span className="text-body">
                  {LEDGER_LABELS[row.reason as LedgerReason] ?? row.reason}
                </span>
                <span className="ml-auto text-2xs uppercase tracking-[0.1em] text-label">
                  {timeAgo(row.createdAt)}
                </span>
                <span className="tabular w-8 text-right text-label">{row.balance}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- recovery ---- */}
      <div className="border border-amber/40">
        <div className="border-b border-amber/30 bg-panel px-2 py-1">
          <span className="field text-amber">Recovery key</span>
        </div>
        <div className="p-3">
          <p className="text-sm leading-relaxed text-body">
            There is no password reset, because there is no account to reset. If you lose this
            browser without saving the key below, the codename, the Keys, and every thread go with
            it. We cannot restore them - that is the same property that stops anyone else taking
            them.
          </p>

          {showRecovery && identity ? (
            <div className="mt-3">
              <CopyField value={encodeRecoveryKey(identity)} />
              <p className="mt-2 text-2xs uppercase tracking-[0.1em] text-alert">
                Anyone holding this is you. Store it like a password.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRecovery(true)}
              className="cmd mt-3"
              disabled={!identity}
            >
              Reveal recovery key
            </button>
          )}
        </div>
      </div>

      <RestoreBox
        value={restoreInput}
        onChange={setRestoreInput}
        onRestore={onRestore}
        busy={restoring}
        error={error}
      />
    </div>
  );
}

function RestoreBox({
  value,
  onChange,
  onRestore,
  busy,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onRestore: () => void;
  busy: boolean;
  error: string | null;
}) {
  return (
    <details className="border border-hairline">
      <summary className="cursor-pointer bg-panel px-2 py-1">
        <span className="field">Restore a ghost from another device</span>
      </summary>
      <div className="p-3">
        <label htmlFor="recovery" className="sr-only">
          Recovery key
        </label>
        <textarea
          id="recovery"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder="VD1-…"
          className="input min-h-[80px] resize-none font-mono text-sm"
        />
        <p className="mt-2 text-sm text-label">
          This replaces whatever ghost this browser currently holds.
        </p>
        <button
          type="button"
          onClick={onRestore}
          disabled={busy || value.trim().length < 8}
          className="cmd mt-2"
        >
          {busy ? 'Restoring…' : 'Restore'}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-alert">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
