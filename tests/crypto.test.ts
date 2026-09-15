import { describe, expect, it } from 'vitest';
import {
  fromBase64,
  fromBase64Url,
  generateCapabilityToken,
  generateInboxKeypair,
  hashCapabilityToken,
  openInboxMessage,
  openLinkDrop,
  sealLinkDrop,
  sealToInbox,
  toBase64,
  toBase64Url,
} from '@/lib/crypto';
import { sha256Base64 } from '@/lib/server-crypto';

describe('base64 helpers', () => {
  it('round-trips arbitrary bytes', () => {
    const bytes = new Uint8Array([0, 1, 250, 255, 128, 64, 13, 10]);
    expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
  });

  it('round-trips through the URL-safe alphabet', () => {
    // 0xFB 0xFF encodes to characters that differ between the two alphabets.
    const bytes = new Uint8Array([251, 255, 190, 239, 1, 2, 3]);
    const encoded = toBase64Url(bytes);
    expect(encoded).not.toMatch(/[+/=]/);
    expect(Array.from(fromBase64Url(encoded))).toEqual(Array.from(bytes));
  });
});

describe('link drops', () => {
  const secret = 'I never actually read the terms and conditions. Not once.';

  it('round-trips without a passphrase', async () => {
    const { payload, linkKey } = await sealLinkDrop(secret);
    expect(payload.passwordSalt).toBeUndefined();
    await expect(openLinkDrop(payload, linkKey)).resolves.toBe(secret);
  });

  it('does not leak the plaintext into the stored payload', async () => {
    const { payload } = await sealLinkDrop(secret);
    const stored = JSON.stringify(payload);
    expect(stored).not.toContain('terms');
    expect(stored).not.toContain('never actually');
  });

  it('produces a different ciphertext every time', async () => {
    const a = await sealLinkDrop(secret);
    const b = await sealLinkDrop(secret);
    expect(a.payload.ciphertext).not.toBe(b.payload.ciphertext);
    expect(a.linkKey).not.toBe(b.linkKey);
  });

  it('fails with the wrong key', async () => {
    const { payload } = await sealLinkDrop(secret);
    const other = await sealLinkDrop('decoy');
    await expect(openLinkDrop(payload, other.linkKey)).rejects.toThrow();
  });

  it('round-trips with a passphrase', async () => {
    const { payload, linkKey } = await sealLinkDrop(secret, 'correct horse');
    expect(payload.passwordSalt).toBeTypeOf('string');
    await expect(openLinkDrop(payload, linkKey, 'correct horse')).resolves.toBe(secret);
  });

  it('rejects the right key with the wrong passphrase', async () => {
    const { payload, linkKey } = await sealLinkDrop(secret, 'correct horse');
    await expect(openLinkDrop(payload, linkKey, 'wrong horse')).rejects.toThrow();
  });

  it('refuses to open a passphrase drop with the link alone', async () => {
    const { payload, linkKey } = await sealLinkDrop(secret, 'correct horse');
    await expect(openLinkDrop(payload, linkKey)).rejects.toThrow(/passphrase/i);
  });

  it('handles unicode and long bodies intact', async () => {
    const body = '🔐 ' + 'أسرار '.repeat(200) + '終わり';
    const { payload, linkKey } = await sealLinkDrop(body);
    await expect(openLinkDrop(payload, linkKey)).resolves.toBe(body);
  });
});

describe('inbox drops', () => {
  it('lets the owner read a message sealed to their public key', async () => {
    const owner = await generateInboxKeypair();
    const message = await sealToInbox(owner.publicKey, 'you were kinder than you had to be');
    await expect(
      openInboxMessage(owner.privateKey, owner.publicKey, message)
    ).resolves.toBe('you were kinder than you had to be');
  });

  it('keeps the plaintext out of the stored payload', async () => {
    const owner = await generateInboxKeypair();
    const message = await sealToInbox(owner.publicKey, 'a distinctive phrase');
    expect(JSON.stringify(message)).not.toContain('distinctive');
  });

  it('uses a fresh ephemeral key per message', async () => {
    const owner = await generateInboxKeypair();
    const a = await sealToInbox(owner.publicKey, 'one');
    const b = await sealToInbox(owner.publicKey, 'one');
    expect(a.senderPubKey).not.toBe(b.senderPubKey);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('cannot be read by a different inbox', async () => {
    const owner = await generateInboxKeypair();
    const eavesdropper = await generateInboxKeypair();
    const message = await sealToInbox(owner.publicKey, 'not for you');
    await expect(
      openInboxMessage(eavesdropper.privateKey, eavesdropper.publicKey, message)
    ).rejects.toThrow();
  });

  it('cannot be read with a forged sender key', async () => {
    const owner = await generateInboxKeypair();
    const attacker = await generateInboxKeypair();
    const message = await sealToInbox(owner.publicKey, 'not for you');
    await expect(
      openInboxMessage(owner.privateKey, owner.publicKey, {
        ...message,
        senderPubKey: attacker.publicKey,
      })
    ).rejects.toThrow();
  });
});

describe('capability tokens', () => {
  it('generates distinct, URL-safe tokens', () => {
    const a = generateCapabilityToken();
    const b = generateCapabilityToken();
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/[+/=]/);
  });

  it('hashes identically in the browser and on the server', async () => {
    const token = generateCapabilityToken();
    expect(await hashCapabilityToken(token)).toBe(sha256Base64(token));
  });
});
