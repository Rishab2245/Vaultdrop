/** Shared vocabulary for the app. Kept in one place so the UI and the API agree. */

export const MOODS = [
  { id: 'confession', label: 'Confession', glyph: '🕯' },
  { id: 'regret', label: 'Regret', glyph: '🥀' },
  { id: 'crush', label: 'Crush', glyph: '💘' },
  { id: 'fear', label: 'Fear', glyph: '🌑' },
  { id: 'joy', label: 'Joy', glyph: '✦' },
  { id: 'rage', label: 'Rage', glyph: '🔥' },
] as const;

export type MoodId = (typeof MOODS)[number]['id'];

export const MOOD_IDS = MOODS.map((m) => m.id) as readonly string[];

export function isMood(value: unknown): value is MoodId {
  return typeof value === 'string' && MOOD_IDS.includes(value);
}

/**
 * Gradient presets for share cards. These are the whole growth engine: a secret
 * that looks good as a screenshot travels, and one that doesn't, doesn't.
 */
export const PALETTES = [
  { from: '#7C5CFF', to: '#F45D9E', name: 'Nocturne' },
  { from: '#3BE8B0', to: '#2B8CFF', name: 'Cyan' },
  { from: '#FF6B4A', to: '#FFC24A', name: 'Ember' },
  { from: '#B06CFF', to: '#4B2FD6', name: 'Orchid' },
  { from: '#1F2937', to: '#4B5563', name: 'Graphite' },
  { from: '#FF5F8F', to: '#FFB36B', name: 'Dusk' },
] as const;

export const REACTIONS = [
  { id: 'felt', label: 'Felt that', glyph: '🫀', column: 'reactFelt' },
  { id: 'hug', label: 'Sending love', glyph: '🫂', column: 'reactHug' },
  { id: 'whoa', label: 'No way', glyph: '👁', column: 'reactWhoa' },
  { id: 'same', label: 'Same', glyph: '🪞', column: 'reactSame' },
] as const;

export type ReactionId = (typeof REACTIONS)[number]['id'];

export const REACTION_IDS = REACTIONS.map((r) => r.id) as readonly string[];

export function isReaction(value: unknown): value is ReactionId {
  return typeof value === 'string' && REACTION_IDS.includes(value);
}

export const REPORT_REASONS = [
  { id: 'doxxing', label: 'Names or identifies someone' },
  { id: 'threat', label: 'Threat or incitement' },
  { id: 'minor', label: 'Involves a minor' },
  { id: 'spam', label: 'Spam or advertising' },
  { id: 'illegal', label: 'Illegal content' },
] as const;

export const REPORT_REASON_IDS = REPORT_REASONS.map((r) => r.id) as readonly string[];

export function isReportReason(value: unknown): boolean {
  return typeof value === 'string' && REPORT_REASON_IDS.includes(value);
}

/** Reports needed before a secret is auto-hidden pending review. */
export const AUTO_HIDE_REPORT_THRESHOLD = 3;

export const LIMITS = {
  wallBodyMax: 600,
  wallBodyMin: 8,
  dropBodyMax: 20_000,
  /** Ciphertext is base64 and larger than the plaintext; allow generous headroom. */
  ciphertextMax: 60_000,
  handleMin: 3,
  handleMax: 24,
  inboxMessageMax: 2_000,
} as const;

export const EXPIRY_OPTIONS = [
  { id: '1h', label: '1 hour', ms: 60 * 60 * 1000 },
  { id: '24h', label: '24 hours', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30 days', ms: 30 * 24 * 60 * 60 * 1000 },
] as const;

export type ExpiryId = (typeof EXPIRY_OPTIONS)[number]['id'];

export function expiryToMs(id: string): number | null {
  return EXPIRY_OPTIONS.find((o) => o.id === id)?.ms ?? null;
}

/** Inbox handles are lowercase, URL-safe, and not confusable with routes. */
const RESERVED_HANDLES = new Set([
  'api',
  'wall',
  'drop',
  'inbox',
  'vault',
  'to',
  'd',
  'about',
  'privacy',
  'terms',
  'admin',
  'settings',
  'new',
  'null',
  'undefined',
]);

export function normaliseHandle(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '');
}

export function validateHandle(raw: string): { ok: true; handle: string } | { ok: false; error: string } {
  const handle = normaliseHandle(raw);
  if (handle.length < LIMITS.handleMin) {
    return { ok: false, error: `Handle must be at least ${LIMITS.handleMin} characters.` };
  }
  if (handle.length > LIMITS.handleMax) {
    return { ok: false, error: `Handle must be at most ${LIMITS.handleMax} characters.` };
  }
  if (RESERVED_HANDLES.has(handle)) {
    return { ok: false, error: 'That handle is reserved.' };
  }
  return { ok: true, handle };
}
