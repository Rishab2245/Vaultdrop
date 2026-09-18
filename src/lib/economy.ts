/**
 * The Exchange.
 *
 * A secret is the price of a secret. Filing records earns Keys, opening a
 * locked record spends them, and the author is paid only once the opener
 * confirms it was worth reading.
 *
 * The escrow is the whole design. Paying on open rewards whoever writes the
 * best teaser, and the teaser is the one part of a locked record nobody can
 * verify before paying for it. Paying on confirmation rewards the secret.
 *
 * Keys are deliberately not money and deliberately not cashable. A platform
 * that pays cash for secrets gets invented ones, because fabricating a
 * compelling secret costs a liar nothing and is indistinguishable from the real
 * thing at the point of sale. Keys can only be minted by participating, so the
 * only way to earn is to satisfy people who have already read the thing.
 */

export const ECONOMY = {
  /** Granted once per UTC day, so a newcomer can open something immediately. */
  dailyGrant: 3,
  /** Starting balance, enough to open one mid-priced record. */
  welcomeGrant: 5,
  /** Filing a public record. Small - posting is not the valuable act. */
  fileReward: 1,

  /** Author-set price bounds for a locked record. */
  minPrice: 1,
  maxPrice: 10,

  /**
   * Refunded to the opener on a "not worth it". Not the full price: if reading
   * were free whenever you said so, everyone would say so.
   */
  refundRate: 0.7,

  /**
   * Escrow auto-releases to the author after this long unrated. Without it,
   * authors are never paid for the majority of opens that nobody bothers to
   * rate, and locking a record stops being worth doing.
   */
  verdictWindowHours: 72,

  /** Anti-farming. */
  maxFilesPerDay: 10,
  /** Opens of the same author beyond this earn that author nothing. */
  sameAuthorOpenCap: 3,
  /** A record this similar to an existing one is treated as a repost. */
  duplicateHammingThreshold: 6,
} as const;

export const LEDGER_REASONS = [
  'welcome',
  'daily',
  'file',
  'open',
  'release',
  'refund',
  'duplicate_void',
] as const;

export type LedgerReason = (typeof LEDGER_REASONS)[number];

/** Human-facing copy for a ledger row. */
export const LEDGER_LABELS: Record<LedgerReason, string> = {
  welcome: 'Opening balance',
  daily: 'Daily grant',
  file: 'Filed a record',
  open: 'Opened a record',
  release: 'A record of yours was worth it',
  refund: 'Refunded - not worth it',
  duplicate_void: 'Voided as a repost',
};

/** Clamp an author-proposed price into the allowed band. */
export function clampPrice(raw: unknown): number {
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return ECONOMY.minPrice;
  return Math.max(ECONOMY.minPrice, Math.min(ECONOMY.maxPrice, n));
}

/** Keys returned to the opener when they say a record was not worth it. */
export function refundFor(priceKeys: number): number {
  return Math.max(1, Math.floor(priceKeys * ECONOMY.refundRate));
}

/** The UTC day key used to make the daily grant idempotent. */
export function utcDayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Diminishing returns for repeatedly opening the same author.
 *
 * Two ghosts could otherwise open each other's records in a loop and mint Keys
 * out of nothing. Past the cap the opener still pays and still reads - they
 * just stop being a source of income for that particular author.
 */
export function payoutForOpen(priceKeys: number, priorOpensOfThisAuthor: number): number {
  return priorOpensOfThisAuthor >= ECONOMY.sameAuthorOpenCap ? 0 : priceKeys;
}

/** Whether an escrowed open is old enough to settle in the author's favour. */
export function escrowIsStale(createdAt: Date, now: Date = new Date()): boolean {
  const ageHours = (now.getTime() - createdAt.getTime()) / 3_600_000;
  return ageHours >= ECONOMY.verdictWindowHours;
}

/**
 * Reputation as a percentage, or null when there is not enough evidence.
 *
 * Showing "100%" after a single open invites exactly the manipulation the
 * number exists to expose, so it stays hidden until there is something to see.
 */
export function worthItRate(worthIt: number, notWorth: number): number | null {
  const total = worthIt + notWorth;
  if (total < 3) return null;
  return Math.round((worthIt / total) * 100);
}

/** A short standing for a ghost, derived only from its own record. */
export function standingOf(worthIt: number, notWorth: number): string {
  const rate = worthItRate(worthIt, notWorth);
  if (rate === null) return 'UNPROVEN';
  if (rate >= 85) return 'TRUSTED';
  if (rate >= 60) return 'FAIR';
  if (rate >= 35) return 'MIXED';
  return 'POOR';
}
