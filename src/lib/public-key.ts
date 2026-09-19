import { createPublicKey } from 'node:crypto';

/**
 * Reject a published key that is not a real ECDH P-256 public key.
 *
 * This existed as an assumption and not as a check, and the assumption was
 * wrong: a seeding script stored sixty literal 'S' characters as a public key,
 * every record by those ghosts became unreachable, and the failure surfaced in
 * the browser as "this needs a secure connection" - blaming the user's
 * connection for our own bad data.
 *
 * Validating on the way in is the only place this can be caught cheaply. Once a
 * junk key is stored, every attempt to reach that ghost fails at decrypt time,
 * far from the cause.
 */
export function isValidEcdhPublicKey(base64: string): boolean {
  try {
    const der = Buffer.from(base64, 'base64');

    // A P-256 SPKI is 91 bytes. Anything wildly off is not worth parsing.
    if (der.length < 80 || der.length > 200) return false;

    const key = createPublicKey({ key: der, format: 'der', type: 'spki' });
    if (key.asymmetricKeyType !== 'ec') return false;

    const details = key.asymmetricKeyDetails;
    return details?.namedCurve === 'prime256v1';
  } catch {
    return false;
  }
}
