'use client';

import {
  fromBase64Url,
  generateCapabilityToken,
  generateInboxKeypair,
  hashCapabilityToken,
  toBase64Url,
} from './crypto';

/**
 * Ghost identity, browser side.
 *
 * A ghost is the minimum continuity the Exchange needs: a Key balance and a
 * reputation have to survive a page reload. It is still not an account. There
 * is no email, no password, no phone number, and no recovery path that runs
 * through the server - which also means losing it is permanent, so the recovery
 * key below is not a nicety.
 *
 * Two secrets, doing different jobs:
 *
 *   secret      A bearer credential. The server stores only its SHA-256 and
 *               uses it to identify the ghost on a request.
 *   privateKey  The ECDH half used to read thread messages. Never transmitted,
 *               under any circumstances.
 */

const STORAGE_KEY = 'vaultdrop.ghost.v1';

export interface GhostIdentity {
  /** Bearer credential. Hashed before it reaches the server. */
  secret: string;
  /** sha256(secret), base64url. The ghost's public id. */
  id: string;
  /** Assigned by the server, derived from the id. */
  codename: string;
  /** base64 SPKI, ECDH P-256. Published. */
  publicKey: string;
  /** base64 PKCS8. Stays here. */
  privateKey: string;
}

function read(): GhostIdentity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GhostIdentity;
    if (!parsed?.secret || !parsed?.id || !parsed?.privateKey) return null;
    return parsed;
  } catch {
    // Private mode, cleared storage, or a browser refusing access. A ghost that
    // cannot be read is a ghost that does not exist yet.
    return null;
  }
}

function write(identity: GhostIdentity): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  } catch {
    /* nothing useful to do; the session simply will not persist */
  }
}

export function getGhost(): GhostIdentity | null {
  return read();
}

export function forgetGhost(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Create a ghost and register its public half.
 *
 * Idempotent: if this browser already has one, it is returned untouched. Two
 * ghosts in one browser would silently split someone's Keys between them.
 */
export async function ensureGhost(): Promise<GhostIdentity> {
  const existing = read();
  if (existing) return existing;

  const secret = generateCapabilityToken();
  const id = await deriveGhostId(secret);
  const { publicKey, privateKey } = await generateInboxKeypair();

  const response = await fetch('/api/ghost', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, publicKey }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Could not register a ghost.');
  }

  const data = (await response.json()) as { codename: string };
  const identity: GhostIdentity = {
    secret,
    id,
    codename: data.codename,
    publicKey,
    privateKey,
  };

  write(identity);
  return identity;
}

/** Re-import a ghost from a recovery key on another device. */
export async function restoreGhost(recoveryKey: string): Promise<GhostIdentity> {
  const decoded = decodeRecoveryKey(recoveryKey);
  if (!decoded) throw new Error('That does not look like a VaultDrop recovery key.');

  const response = await fetch('/api/ghost', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: decoded.id, publicKey: decoded.publicKey }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'Could not restore that ghost.');
  }

  const data = (await response.json()) as { codename: string };
  const identity: GhostIdentity = { ...decoded, codename: data.codename };
  write(identity);
  return identity;
}

/** Authorization header for an authenticated call. */
export function ghostHeaders(identity: GhostIdentity | null): Record<string, string> {
  return identity ? { authorization: `Ghost ${identity.secret}` } : {};
}

/* ------------------------------------------------------------------ */
/* Recovery key                                                        */
/* ------------------------------------------------------------------ */

/**
 * The whole identity as one transportable string.
 *
 * Grouped into blocks because people transcribe these by hand off a second
 * screen, and an unbroken 300-character run is a guaranteed typo.
 */
export function encodeRecoveryKey(identity: GhostIdentity): string {
  const payload = JSON.stringify({
    v: 1,
    s: identity.secret,
    i: identity.id,
    k: identity.publicKey,
    p: identity.privateKey,
  });

  const bytes = new TextEncoder().encode(payload);
  const encoded = toBase64Url(bytes);
  return `VD1-${(encoded.match(/.{1,48}/g) ?? []).join('\n')}`;
}

export function decodeRecoveryKey(raw: string): GhostIdentity | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('VD1-')) return null;

    const body = trimmed.slice(4).replace(/\s+/g, '');
    const json = new TextDecoder().decode(fromBase64Url(body));
    const parsed = JSON.parse(json) as { v: number; s: string; i: string; k: string; p: string };

    if (parsed.v !== 1 || !parsed.s || !parsed.i || !parsed.k || !parsed.p) return null;

    return {
      secret: parsed.s,
      id: parsed.i,
      codename: '',
      publicKey: parsed.k,
      privateKey: parsed.p,
    };
  } catch {
    return null;
  }
}

/**
 * sha256(secret) as URL-safe base64.
 *
 * Must stay byte-for-byte identical to deriveGhostIdFromSecret on the server,
 * or every request authenticates as nobody.
 */
export async function deriveGhostId(secret: string): Promise<string> {
  const standard = await hashCapabilityToken(secret);
  return standard.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
