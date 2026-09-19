import { webcrypto } from 'node:crypto';

/**
 * A real ECDH P-256 public key, for tests that register a ghost.
 *
 * The suite used to pass a run of 'A' characters here, which the seeding script
 * also did - and that is how two dozen live ghosts ended up with keys nothing
 * could encrypt to. Registration now validates the key, so generating a real
 * one is no longer optional, and a test that fakes it fails the way the real
 * client would.
 */
export async function realPublicKey(): Promise<string> {
  const pair = await webcrypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  const spki = await webcrypto.subtle.exportKey('spki', pair.publicKey);
  return Buffer.from(spki).toString('base64');
}
