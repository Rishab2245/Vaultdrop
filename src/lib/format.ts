const UNITS: [limitSeconds: number, divisor: number, label: string][] = [
  [60, 1, 's'],
  [3600, 60, 'm'],
  [86400, 3600, 'h'],
  [2592000, 86400, 'd'],
];

/** Compact relative time: "just now", "4m", "3h", "12d", then a date. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.max(0, (now - then) / 1000);
  if (seconds < 10) return 'just now';

  for (const [limit, divisor, label] of UNITS) {
    if (seconds < limit) return `${Math.floor(seconds / divisor)}${label}`;
  }

  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** "in 3 hours" style countdown, for drop expiry. */
export function timeUntil(iso: string, now: number = Date.now()): string {
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return '';

  const seconds = (target - now) / 1000;
  if (seconds <= 0) return 'expired';
  if (seconds < 60) return 'under a minute';
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86400)} days`;
}

/**
 * A short, stable record label for a database id.
 *
 * Purely presentational - the system displays records by reference, not by
 * cuid, and "REC 0x2F91" carries the right weight where a raw cuid reads as
 * debug output. Derived deterministically so the same secret always shows the
 * same reference.
 */
export function recordRef(id: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `0x${(hash & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`;
}

export function compactNumber(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;
  return `${(value / 1_000_000).toFixed(1)}m`;
}
