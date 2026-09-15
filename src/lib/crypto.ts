/**
 * VaultDrop end-to-end encryption.
 *
 * Everything here runs in the browser, on top of the platform's own WebCrypto.
 * There are no dependencies, because a crypto layer you cannot read end to end
 * is a crypto layer you cannot trust.
 *
 * Two schemes, one guarantee - the server only ever holds ciphertext:
 *
 *   Link drops   A random AES-256-GCM key is generated locally and travels in
 *                the URL fragment (`#k=...`). Browsers never put the fragment
 *                in a request, so the key physically cannot reach our logs.
 *                An optional passphrase is mixed in via PBKDF2 so that a leaked
 *                link alone is still not enough to read the drop.
 *
 *   Inbox drops  ECDH P-256. The inbox owner's private key is generated in
 *                their browser and never leaves it. Senders derive a shared
 *                secret against the published public key using a throwaway
 *                keypair, which also means two messages to the same inbox share
 *                no key material.
 */

const AES = 'AES-GCM';
const KEY_BITS = 256;
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 600_000;

/** WebCrypto is only exposed in secure contexts (https, or localhost). */
export function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      'WebCrypto is unavailable. VaultDrop requires a secure context (HTTPS or localhost).'
    );
  }
  return subtle;
}

/* ------------------------------------------------------------------ */
/* Encoding helpers                                                    */
/* ------------------------------------------------------------------ */

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** URL-safe base64, for anything that rides in a link fragment. */
export function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  return fromBase64(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function randomBytes(length: number): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

/* ------------------------------------------------------------------ */
/* Link drops                                                          */
/* ------------------------------------------------------------------ */

export interface SealedPayload {
  ciphertext: string;
  iv: string;
  /** Present only when a passphrase was mixed into the key. */
  passwordSalt?: string;
}

/** Raw bytes of a fresh AES-256 key. This is what ends up in the fragment. */
export function generateLinkKeyBytes(): Uint8Array {
  return randomBytes(KEY_BITS / 8);
}

/** HKDF-SHA256 over arbitrary key material, yielding an AES-GCM key. */
async function hkdfToAesKey(
  material: Uint8Array,
  salt: Uint8Array,
  info: string
): Promise<CryptoKey> {
  const subtle = getSubtle();
  const base = await subtle.importKey('raw', material as BufferSource, 'HKDF', false, [
    'deriveKey',
  ]);
  return subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      info: encoder.encode(info) as BufferSource,
    },
    base,
    { name: AES, length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Turn key material into the AES key actually used for the payload.
 *
 * With no passphrase the link key is used directly. With one, the link key and
 * a PBKDF2 stretch of the passphrase are run through HKDF together, so both
 * halves are required and neither is sufficient.
 */
async function deriveContentKey(
  linkKeyBytes: Uint8Array,
  passphrase: string | undefined,
  salt: Uint8Array | undefined
): Promise<CryptoKey> {
  const subtle = getSubtle();

  if (!passphrase) {
    return subtle.importKey('raw', linkKeyBytes as BufferSource, AES, false, [
      'encrypt',
      'decrypt',
    ]);
  }

  if (!salt) throw new Error('A passphrase-protected drop requires a salt.');

  const passphraseKey = await subtle.importKey(
    'raw',
    encoder.encode(passphrase) as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const stretched = new Uint8Array(
    await subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      passphraseKey,
      KEY_BITS
    )
  );

  const combined = new Uint8Array(linkKeyBytes.length + stretched.length);
  combined.set(linkKeyBytes, 0);
  combined.set(stretched, linkKeyBytes.length);

  return hkdfToAesKey(combined, salt, 'vaultdrop/link/v1');
}

/** Encrypt a private drop. Returns the payload to store and the key to share. */
export async function sealLinkDrop(
  plaintext: string,
  passphrase?: string
): Promise<{ payload: SealedPayload; linkKey: string }> {
  const subtle = getSubtle();
  const linkKeyBytes = generateLinkKeyBytes();
  const salt = passphrase ? randomBytes(16) : undefined;
  const iv = randomBytes(IV_BYTES);

  const key = await deriveContentKey(linkKeyBytes, passphrase, salt);
  const ciphertext = new Uint8Array(
    await subtle.encrypt(
      { name: AES, iv: iv as BufferSource },
      key,
      encoder.encode(plaintext) as BufferSource
    )
  );

  return {
    payload: {
      ciphertext: toBase64(ciphertext),
      iv: toBase64(iv),
      ...(salt ? { passwordSalt: toBase64(salt) } : {}),
    },
    linkKey: toBase64Url(linkKeyBytes),
  };
}

/** Decrypt a private drop using the fragment key (and passphrase, if set). */
export async function openLinkDrop(
  payload: SealedPayload,
  linkKey: string,
  passphrase?: string
): Promise<string> {
  const subtle = getSubtle();
  const linkKeyBytes = fromBase64Url(linkKey);
  const salt = payload.passwordSalt ? fromBase64(payload.passwordSalt) : undefined;

  if (salt && !passphrase) throw new Error('This drop needs a passphrase.');

  const key = await deriveContentKey(linkKeyBytes, passphrase, salt);
  const plaintext = await subtle.decrypt(
    { name: AES, iv: fromBase64(payload.iv) as BufferSource },
    key,
    fromBase64(payload.ciphertext) as BufferSource
  );
  return decoder.decode(plaintext);
}

/* ------------------------------------------------------------------ */
/* Inbox drops (ECDH P-256)                                            */
/* ------------------------------------------------------------------ */

const ECDH_PARAMS: EcKeyGenParams = { name: 'ECDH', namedCurve: 'P-256' };

export interface InboxKeypair {
  /** base64 SPKI - published, safe to share. */
  publicKey: string;
  /** base64 PKCS8 - stays in the owner's browser. Shown once as a recovery key. */
  privateKey: string;
}

/** Create an inbox identity. The private half is the user's to keep. */
export async function generateInboxKeypair(): Promise<InboxKeypair> {
  const subtle = getSubtle();
  const pair = await subtle.generateKey(ECDH_PARAMS, true, ['deriveBits']);
  const [spki, pkcs8] = await Promise.all([
    subtle.exportKey('spki', pair.publicKey),
    subtle.exportKey('pkcs8', pair.privateKey),
  ]);
  return {
    publicKey: toBase64(new Uint8Array(spki)),
    privateKey: toBase64(new Uint8Array(pkcs8)),
  };
}

async function importEcdhPublic(b64: string): Promise<CryptoKey> {
  return getSubtle().importKey('spki', fromBase64(b64) as BufferSource, ECDH_PARAMS, true, []);
}

async function importEcdhPrivate(b64: string): Promise<CryptoKey> {
  return getSubtle().importKey('pkcs8', fromBase64(b64) as BufferSource, ECDH_PARAMS, false, [
    'deriveBits',
  ]);
}

/** Shared AES key for one message, bound to both parties' public keys. */
async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
  salt: Uint8Array
): Promise<CryptoKey> {
  const bits = new Uint8Array(
    await getSubtle().deriveBits({ name: 'ECDH', public: publicKey }, privateKey, KEY_BITS)
  );
  return hkdfToAesKey(bits, salt, 'vaultdrop/inbox/v1');
}

export interface SealedInboxMessage {
  ciphertext: string;
  iv: string;
  senderPubKey: string;
}

/**
 * Encrypt a message to an inbox. The sender uses a throwaway keypair, so the
 * message is unlinkable to them and to every other message they send.
 */
export async function sealToInbox(
  recipientPublicKey: string,
  plaintext: string
): Promise<SealedInboxMessage> {
  const subtle = getSubtle();
  const ephemeral = await subtle.generateKey(ECDH_PARAMS, true, ['deriveBits']);
  const recipient = await importEcdhPublic(recipientPublicKey);

  const senderPubKeyBytes = new Uint8Array(await subtle.exportKey('spki', ephemeral.publicKey));
  const iv = randomBytes(IV_BYTES);

  // Salting HKDF with the recipient's key binds the message to this inbox.
  const key = await deriveSharedKey(
    ephemeral.privateKey,
    recipient,
    fromBase64(recipientPublicKey)
  );
  const ciphertext = new Uint8Array(
    await subtle.encrypt(
      { name: AES, iv: iv as BufferSource },
      key,
      encoder.encode(plaintext) as BufferSource
    )
  );

  return {
    ciphertext: toBase64(ciphertext),
    iv: toBase64(iv),
    senderPubKey: toBase64(senderPubKeyBytes),
  };
}

/** Decrypt an inbox message with the owner's private key. */
export async function openInboxMessage(
  ownerPrivateKey: string,
  ownerPublicKey: string,
  message: SealedInboxMessage
): Promise<string> {
  const privateKey = await importEcdhPrivate(ownerPrivateKey);
  const senderPublic = await importEcdhPublic(message.senderPubKey);
  const key = await deriveSharedKey(privateKey, senderPublic, fromBase64(ownerPublicKey));

  const plaintext = await getSubtle().decrypt(
    { name: AES, iv: fromBase64(message.iv) as BufferSource },
    key,
    fromBase64(message.ciphertext) as BufferSource
  );
  return decoder.decode(plaintext);
}

/* ------------------------------------------------------------------ */
/* Capability tokens                                                   */
/* ------------------------------------------------------------------ */

/**
 * A bearer token that proves "I wrote this" without saying who "I" is.
 * The client keeps the token; the server keeps only its SHA-256 hash.
 */
export function generateCapabilityToken(): string {
  return toBase64Url(randomBytes(32));
}

export async function hashCapabilityToken(token: string): Promise<string> {
  const digest = await getSubtle().digest('SHA-256', encoder.encode(token) as BufferSource);
  return toBase64(new Uint8Array(digest));
}
