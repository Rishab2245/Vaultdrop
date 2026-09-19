'use client';

import { CopyField } from './CopyField';

/**
 * Bitcoin donations.
 *
 * The address comes from the environment and is validated before it is shown.
 * There is no placeholder and no fallback on purpose: a wrong Bitcoin address
 * rendered as if it were right sends somebody's money somewhere unrecoverable,
 * and there is no support desk to undo it. If the value is missing or does not
 * parse, this component renders nothing at all.
 */

/**
 * Structural check only - it confirms the shape and the alphabet, not that the
 * address belongs to anyone in particular. Base58 forms exclude 0/O/I/l;
 * bech32 is lowercase and excludes 1/b/i/o after the prefix.
 */
export function isPlausibleBitcoinAddress(value: string): boolean {
  const address = value.trim();
  if (/^(bc1)[023456789acdefghjklmnpqrstuvwxyz]{8,87}$/.test(address)) return true;
  if (/^[13][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) return true;
  return false;
}

export function Donate() {
  const address = (process.env.NEXT_PUBLIC_BTC_ADDRESS ?? '').trim();

  // Nothing to show, or something that is not an address. Say nothing rather
  // than render a box that invites people to send money into a void.
  if (!address || !isPlausibleBitcoinAddress(address)) return null;

  return (
    <section className="border border-hairline">
      <div className="border-b border-hairline bg-panel px-2 py-1">
        <span className="field">Keep it running</span>
      </div>

      <div className="p-3">
        <p className="text-sm leading-relaxed text-body">
          VaultDrop has no ads, no tracking, and nothing to sell &mdash; which also means nothing
          pays for it. If it has been useful, Bitcoin is the one way to help that does not require
          telling anyone who you are.
        </p>

        <div className="mt-3">
          <p className="field mb-1.5">Bitcoin</p>
          <CopyField value={address} />
        </div>

        <p className="mt-3 text-2xs uppercase tracking-[0.1em] text-label">
          Check the address before sending &middot; a Bitcoin transfer cannot be reversed
        </p>
      </div>
    </section>
  );
}
