import { describe, expect, it } from 'vitest';
import {
  ECONOMY,
  clampPrice,
  escrowIsStale,
  payoutForOpen,
  refundFor,
  standingOf,
  utcDayKey,
  worthItRate,
} from '@/lib/economy';
import { hammingDistance, isNearDuplicate, normalise, simhash } from '@/lib/simhash';
import { detectCrisis } from '@/lib/crisis';
import { codenameFor } from '@/lib/ghost-server';

describe('pricing', () => {
  it('holds an author to the allowed band', () => {
    expect(clampPrice(5)).toBe(5);
    expect(clampPrice(0)).toBe(ECONOMY.minPrice);
    expect(clampPrice(9999)).toBe(ECONOMY.maxPrice);
    expect(clampPrice(-4)).toBe(ECONOMY.minPrice);
  });

  it('falls back to the minimum for junk input', () => {
    expect(clampPrice('abc')).toBe(ECONOMY.minPrice);
    expect(clampPrice(null)).toBe(ECONOMY.minPrice);
    expect(clampPrice(undefined)).toBe(ECONOMY.minPrice);
    expect(clampPrice(Number.NaN)).toBe(ECONOMY.minPrice);
  });
});

describe('refunds', () => {
  it('returns most of the price, never all of it', () => {
    // A full refund would make reading free for anyone willing to click the
    // second button, and then everyone clicks it.
    for (let price = ECONOMY.minPrice; price <= ECONOMY.maxPrice; price++) {
      expect(refundFor(price)).toBeLessThan(price === 1 ? 2 : price);
      expect(refundFor(price)).toBeGreaterThanOrEqual(1);
    }
  });

  it('still gives a token refund on the cheapest record', () => {
    expect(refundFor(1)).toBe(1);
  });
});

describe('anti-farming', () => {
  it('pays for the first few opens by the same reader', () => {
    expect(payoutForOpen(5, 0)).toBe(5);
    expect(payoutForOpen(5, ECONOMY.sameAuthorOpenCap - 1)).toBe(5);
  });

  it('stops paying once a pair is trading in a loop', () => {
    expect(payoutForOpen(5, ECONOMY.sameAuthorOpenCap)).toBe(0);
    expect(payoutForOpen(5, 99)).toBe(0);
  });
});

describe('escrow window', () => {
  it('keeps a fresh open held', () => {
    expect(escrowIsStale(new Date(Date.now() - 60_000))).toBe(false);
  });

  it('releases once the rating window has passed', () => {
    const old = new Date(Date.now() - (ECONOMY.verdictWindowHours + 1) * 3_600_000);
    expect(escrowIsStale(old)).toBe(true);
  });
});

describe('daily grant key', () => {
  it('is stable within a UTC day and changes across one', () => {
    expect(utcDayKey(new Date('2026-03-04T00:00:01Z'))).toBe('2026-03-04');
    expect(utcDayKey(new Date('2026-03-04T23:59:59Z'))).toBe('2026-03-04');
    expect(utcDayKey(new Date('2026-03-05T00:00:00Z'))).toBe('2026-03-05');
  });
});

describe('reputation', () => {
  it('stays hidden until there is evidence', () => {
    // "100%" after one open invites exactly the manipulation it exists to expose.
    expect(worthItRate(1, 0)).toBeNull();
    expect(worthItRate(2, 0)).toBeNull();
    expect(worthItRate(3, 0)).toBe(100);
  });

  it('reports a rate once there is', () => {
    expect(worthItRate(9, 1)).toBe(90);
    expect(worthItRate(1, 9)).toBe(10);
  });

  it('maps to a standing', () => {
    expect(standingOf(0, 0)).toBe('UNPROVEN');
    expect(standingOf(10, 0)).toBe('TRUSTED');
    expect(standingOf(7, 3)).toBe('FAIR');
    expect(standingOf(4, 6)).toBe('MIXED');
    expect(standingOf(1, 9)).toBe('POOR');
  });
});

describe('codenames', () => {
  it('is deterministic, so a restored ghost keeps its name', () => {
    expect(codenameFor('abc123')).toBe(codenameFor('abc123'));
  });

  it('differs across ghosts and matches the expected shape', () => {
    expect(codenameFor('abc123')).not.toBe(codenameFor('abc124'));
    expect(codenameFor('abc123')).toMatch(/^GHOST-[0-9A-F]{4}-[A-Z]$/);
  });
});

describe('duplicate detection', () => {
  const original =
    'I have been pretending to understand my job for two years and I am terrified someone will finally ask me a direct question about it.';

  it('normalises away the things a lazy reposter changes', () => {
    expect(normalise("It's  HERE!!")).toBe('its here');
  });

  it('matches a record against itself', () => {
    const hash = simhash(original)!;
    expect(hammingDistance(hash, hash)).toBe(0);
  });

  it('catches a copy-paste with cosmetic edits', () => {
    const reposted =
      'I HAVE been pretending to understand my job for two years, and I am terrified someone will finally ask me a direct question about it!!!';
    const a = simhash(original)!;
    const b = simhash(reposted)!;
    expect(isNearDuplicate(a, b, ECONOMY.duplicateHammingThreshold)).toBe(true);
  });

  it('leaves two genuinely different confessions alone', () => {
    const other =
      'My grandmother called three times the week she died and I kept meaning to call back after work. I have never played her last voicemail.';
    const a = simhash(original)!;
    const b = simhash(other)!;
    expect(isNearDuplicate(a, b, ECONOMY.duplicateHammingThreshold)).toBe(false);
  });

  it('declines to fingerprint text too short to judge', () => {
    expect(simhash('')).toBeNull();
    expect(simhash('   ')).toBeNull();
  });
});

describe('crisis detection', () => {
  it('catches statements of intent', () => {
    expect(detectCrisis('honestly i want to die')?.kind).toBe('self_harm');
    expect(detectCrisis('I have been thinking about killing myself')?.kind).toBe('self_harm');
    expect(detectCrisis('everyone would be better off without me')?.kind).toBe('self_harm');
  });

  it('catches disclosures of abuse', () => {
    expect(detectCrisis('my husband hits me and I have told nobody')?.kind).toBe('abuse');
    expect(detectCrisis('I was raped last year')?.kind).toBe('abuse');
  });

  it('leaves ordinary confessions alone', () => {
    expect(detectCrisis('I ate my flatmate&apos;s leftovers and blamed the cat')).toBeNull();
    expect(detectCrisis('I am still in love with someone I should not be')).toBeNull();
    expect(detectCrisis('')).toBeNull();
  });

  it('prefers the more time-critical signal when both appear', () => {
    const signal = detectCrisis('he hits me and I want to die');
    expect(signal?.kind).toBe('self_harm');
  });
});
