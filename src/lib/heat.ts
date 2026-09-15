/**
 * Wall ranking.
 *
 * Gravity-decayed, in the spirit of Hacker News: engagement lifts a secret,
 * time pulls it back down. Without the decay the wall calcifies within a week
 * and nothing new is ever seen, which is how a confession feed dies.
 *
 * Reactions are weighted by how much effort they signal. "Same" is one tap of
 * recognition; "sending love" usually means someone actually read the thing.
 */

const GRAVITY = 1.5;
const VIEW_WEIGHT = 0.05;
const SEED_POINT = 1;

export interface HeatInput {
  reactFelt: number;
  reactHug: number;
  reactWhoa: number;
  reactSame: number;
  viewCount: number;
  createdAt: Date;
}

export function computeHeat(input: HeatInput, now: Date = new Date()): number {
  // The seed point matters: without it a brand-new secret scores zero and can
  // never climb, so nothing ever gets its first reader and the wall only shows
  // what was already popular. Every secret starts with a chance and decays from
  // there.
  const engagement =
    SEED_POINT +
    input.reactFelt * 1.5 +
    input.reactHug * 2 +
    input.reactWhoa * 1.2 +
    input.reactSame * 1 +
    input.viewCount * VIEW_WEIGHT;

  const ageHours = Math.max(0, (now.getTime() - input.createdAt.getTime()) / 3_600_000);

  // The +2 keeps brand-new posts from an unbounded score spike.
  return engagement / Math.pow(ageHours + 2, GRAVITY);
}
