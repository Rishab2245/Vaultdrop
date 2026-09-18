/**
 * Near-duplicate detection for Wall records.
 *
 * The original build outsourced this to OpenAI embeddings and a Pinecone index.
 * That is a lot of moving parts, two API keys, and a per-record cost for a job
 * that Charikar's SimHash does well enough locally: reposting an existing
 * secret with a few words changed should not mint Keys.
 *
 * SimHash maps similar documents to nearby 64-bit values, so "is this a
 * repost?" becomes a Hamming distance rather than a vector search. It catches
 * copy-paste and light paraphrase, which is the actual farming attack. It will
 * not catch a genuine retelling in someone's own words, and that is fine -
 * two people independently confessing the same thing is the product working.
 */

const HASH_BITS = 64;

/** FNV-1a, 64-bit, on BigInt. Cheap, well-distributed, no dependency. */
function fnv1a64(value: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let i = 0; i < value.length; i++) {
    hash ^= BigInt(value.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash;
}

/**
 * Strip everything that a lazy reposter would change without changing meaning:
 * case, punctuation, and runs of whitespace.
 */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Overlapping word trigrams.
 *
 * Trigrams rather than single words because word-frequency alone collapses
 * every confession about the same topic into the same fingerprint - order is
 * what distinguishes "I never told my mother" from "my mother never told me".
 */
function shingles(text: string): string[] {
  const words = normalise(text).split(' ').filter(Boolean);
  if (words.length <= 3) return words.length ? [words.join(' ')] : [];

  const out: string[] = [];
  for (let i = 0; i <= words.length - 3; i++) {
    out.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return out;
}

/** 64-bit SimHash as a zero-padded hex string, or null for text too short to judge. */
export function simhash(text: string): string | null {
  const features = shingles(text);
  if (features.length === 0) return null;

  const weights = new Array<number>(HASH_BITS).fill(0);

  for (const feature of features) {
    const hash = fnv1a64(feature);
    for (let bit = 0; bit < HASH_BITS; bit++) {
      const isSet = (hash >> BigInt(bit)) & 1n;
      weights[bit] += isSet ? 1 : -1;
    }
  }

  let result = 0n;
  for (let bit = 0; bit < HASH_BITS; bit++) {
    if (weights[bit] > 0) result |= 1n << BigInt(bit);
  }

  return result.toString(16).padStart(16, '0');
}

/** Number of differing bits between two SimHash hex strings. */
export function hammingDistance(a: string, b: string): number {
  let xor = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let bits = 0;
  while (xor) {
    bits += Number(xor & 1n);
    xor >>= 1n;
  }
  return bits;
}

/** True when `candidate` is close enough to `existing` to count as a repost. */
export function isNearDuplicate(
  candidate: string,
  existing: string,
  threshold: number
): boolean {
  return hammingDistance(candidate, existing) <= threshold;
}
