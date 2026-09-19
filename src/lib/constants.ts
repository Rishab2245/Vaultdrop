/** Shared vocabulary for the app. Kept in one place so the UI and the API agree. */

/**
 * Classifications. Rendered as record fields, so they read as terminal codes
 * rather than emoji chips - a system labels its records, it does not decorate
 * them.
 */
export const MOODS = [
  { id: 'confession', label: 'Confession', code: 'CNF' },
  { id: 'regret', label: 'Regret', code: 'RGT' },
  { id: 'crush', label: 'Crush', code: 'CRS' },
  { id: 'fear', label: 'Fear', code: 'FER' },
  { id: 'joy', label: 'Joy', code: 'JOY' },
  { id: 'rage', label: 'Rage', code: 'RAG' },
] as const;

export type MoodId = (typeof MOODS)[number]['id'];

export const MOOD_IDS = MOODS.map((m) => m.id) as readonly string[];

export function isMood(value: unknown): value is MoodId {
  return typeof value === 'string' && MOOD_IDS.includes(value);
}

/**
 * Classification channels.
 *
 * Terminal phosphor colours rather than gradients: one flat signal colour per
 * record, used on the record's rule and on its share card. A gradient would be
 * the first thing to break the "this is a system, not a feed" read.
 */
export const PALETTES = [
  { hex: '#FFA02F', name: 'Amber' },
  { hex: '#00B96B', name: 'Green' },
  { hex: '#F23645', name: 'Red' },
  { hex: '#2FD5E8', name: 'Cyan' },
  { hex: '#9B7BFF', name: 'Violet' },
  { hex: '#E8ECF4', name: 'Chrome' },
] as const;

/** Counters, named as fields. `code` is what appears in a record footer. */
export const REACTIONS = [
  { id: 'felt', label: 'Felt that', code: 'FELT', column: 'reactFelt' },
  { id: 'hug', label: 'Sending love', code: 'HELD', column: 'reactHug' },
  { id: 'whoa', label: 'No way', code: 'WHOA', column: 'reactWhoa' },
  { id: 'same', label: 'Same', code: 'SAME', column: 'reactSame' },
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


/** What a suggestion is about, so the list can be triaged without reading all of it. */
export const SUGGESTION_KINDS = [
  { id: 'idea', label: 'An idea' },
  { id: 'bug', label: 'Something is broken' },
  { id: 'safety', label: 'A safety concern' },
  { id: 'confusing', label: 'Something confused me' },
] as const;

export const SUGGESTION_KIND_IDS = SUGGESTION_KINDS.map((k) => k.id) as readonly string[];

export function isSuggestionKind(value: unknown): boolean {
  return typeof value === 'string' && SUGGESTION_KIND_IDS.includes(value);
}

export const SUGGESTION_MAX = 1000;
