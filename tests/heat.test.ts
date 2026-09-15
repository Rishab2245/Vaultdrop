import { describe, expect, it } from 'vitest';
import { computeHeat } from '@/lib/heat';

const NOW = new Date('2026-09-15T12:00:00Z');

function secret(overrides: Partial<Parameters<typeof computeHeat>[0]> = {}) {
  return {
    reactFelt: 0,
    reactHug: 0,
    reactWhoa: 0,
    reactSame: 0,
    viewCount: 0,
    createdAt: NOW,
    ...overrides,
  };
}

function hoursAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 3_600_000);
}

describe('computeHeat', () => {
  it('gives a brand-new secret a non-zero score', () => {
    // Without this the hot feed can never surface anything new.
    expect(computeHeat(secret(), NOW)).toBeGreaterThan(0);
  });

  it('ranks more engagement above less, at equal age', () => {
    const popular = computeHeat(secret({ reactSame: 50 }), NOW);
    const quiet = computeHeat(secret({ reactSame: 5 }), NOW);
    expect(popular).toBeGreaterThan(quiet);
  });

  it('ranks newer above older, at equal engagement', () => {
    const fresh = computeHeat(secret({ reactSame: 20, createdAt: hoursAgo(1) }), NOW);
    const stale = computeHeat(secret({ reactSame: 20, createdAt: hoursAgo(48) }), NOW);
    expect(fresh).toBeGreaterThan(stale);
  });

  it('lets yesterday’s hit fall below today’s modest post', () => {
    // The property that keeps the wall from calcifying.
    const yesterdaysHit = computeHeat(secret({ reactSame: 400, createdAt: hoursAgo(72) }), NOW);
    const todaysPost = computeHeat(secret({ reactSame: 12, createdAt: hoursAgo(1) }), NOW);
    expect(todaysPost).toBeGreaterThan(yesterdaysHit);
  });

  it('weights a considered reaction above a one-tap one', () => {
    const hugs = computeHeat(secret({ reactHug: 10 }), NOW);
    const sames = computeHeat(secret({ reactSame: 10 }), NOW);
    expect(hugs).toBeGreaterThan(sames);
  });

  it('counts views, but far less than reactions', () => {
    const viewed = computeHeat(secret({ viewCount: 20 }), NOW);
    const reacted = computeHeat(secret({ reactSame: 20 }), NOW);
    expect(viewed).toBeGreaterThan(computeHeat(secret(), NOW));
    expect(reacted).toBeGreaterThan(viewed);
  });

  it('never returns a negative score for a future timestamp', () => {
    const future = computeHeat(secret({ createdAt: new Date(NOW.getTime() + 60_000) }), NOW);
    expect(future).toBeGreaterThan(0);
  });

  it('decays monotonically', () => {
    const scores = [1, 6, 24, 72, 240].map((h) =>
      computeHeat(secret({ reactSame: 30, createdAt: hoursAgo(h) }), NOW)
    );
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]);
    }
  });
});
