'use client';

/**
 * The only "account" VaultDrop has.
 *
 * Everything that would normally live in a users table - what you wrote, what
 * you reacted to, your inbox keys - lives in this browser and nowhere else.
 * That is the whole trade: clear your storage and it is genuinely gone, because
 * there is no copy on our side to restore from.
 */

const KEYS = {
  authored: 'vaultdrop.authored.v1',
  reacted: 'vaultdrop.reacted.v1',
  drops: 'vaultdrop.drops.v1',
  inbox: 'vaultdrop.inbox.v1',
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    // Private mode, disabled storage, or corrupt JSON - behave as if empty.
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked. Losing local history is survivable; crashing is not.
  }
}

/* ---------------- authored wall secrets ---------------- */

export interface AuthoredSecret {
  id: string;
  token: string;
  body: string;
  mood: string;
  palette: number;
  createdAt: string;
}

export function getAuthored(): AuthoredSecret[] {
  return read<AuthoredSecret[]>(KEYS.authored, []);
}

export function rememberAuthored(entry: AuthoredSecret): void {
  write(KEYS.authored, [entry, ...getAuthored()].slice(0, 200));
}

export function forgetAuthored(id: string): void {
  write(
    KEYS.authored,
    getAuthored().filter((s) => s.id !== id)
  );
}

/* ---------------- reactions (client-side dedupe) ---------------- */

type ReactionMap = Record<string, string[]>;

export function getReactions(secretId: string): string[] {
  return read<ReactionMap>(KEYS.reacted, {})[secretId] ?? [];
}

export function hasReacted(secretId: string, reaction: string): boolean {
  return getReactions(secretId).includes(reaction);
}

export function toggleReaction(secretId: string, reaction: string): boolean {
  const all = read<ReactionMap>(KEYS.reacted, {});
  const current = all[secretId] ?? [];
  const active = current.includes(reaction);

  all[secretId] = active ? current.filter((r) => r !== reaction) : [...current, reaction];
  if (all[secretId].length === 0) delete all[secretId];

  write(KEYS.reacted, all);
  return !active;
}

/* ---------------- private drops you created ---------------- */

export interface StoredDrop {
  id: string;
  url: string;
  createdAt: string;
  expiresAt: string;
  burnAfterRead: boolean;
  note: string;
}

export function getDrops(): StoredDrop[] {
  const drops = read<StoredDrop[]>(KEYS.drops, []);
  const now = Date.now();
  const live = drops.filter((d) => new Date(d.expiresAt).getTime() > now);
  if (live.length !== drops.length) write(KEYS.drops, live);
  return live;
}

export function rememberDrop(drop: StoredDrop): void {
  write(KEYS.drops, [drop, ...getDrops()].slice(0, 100));
}

export function forgetDrop(id: string): void {
  write(
    KEYS.drops,
    getDrops().filter((d) => d.id !== id)
  );
}

/* ---------------- inbox identity ---------------- */

export interface StoredInbox {
  handle: string;
  publicKey: string;
  privateKey: string;
  ownerToken: string;
  createdAt: string;
}

export function getInbox(): StoredInbox | null {
  return read<StoredInbox | null>(KEYS.inbox, null);
}

export function saveInbox(inbox: StoredInbox): void {
  write(KEYS.inbox, inbox);
}

export function clearInbox(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(KEYS.inbox);
  } catch {
    /* nothing to do */
  }
}

/** Wipe every trace of this browser's VaultDrop activity. */
export function wipeEverything(): void {
  if (typeof window === 'undefined') return;
  for (const key of Object.values(KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* keep going - a partial wipe beats an aborted one */
    }
  }
}
