import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { LIMITS, expiryToMs } from '@/lib/constants';
import { sweepInBackground } from '@/lib/sweep';

export const dynamic = 'force-dynamic';

/**
 * Store an encrypted drop.
 *
 * Everything arriving here is already ciphertext. The server has no key, no way
 * to obtain one, and no interest in trying - it is a dumb shelf that forgets on
 * a timer. Note that we do not record who uploaded it, from where, or with what
 * client.
 */
export async function POST(request: Request) {
  const limited = guard(request, 'drops:create', RATE_LIMITS.createDrop);
  if (limited) return limited;

  const body = await readJson(request);
  if (!body) return fail(400, 'Malformed request.');

  const ciphertext = asString(body.ciphertext, LIMITS.ciphertextMax);
  const iv = asString(body.iv, 64);
  if (!ciphertext || !iv) return fail(400, 'Missing encrypted payload.');

  const passwordSalt = typeof body.passwordSalt === 'string' ? body.passwordSalt.slice(0, 64) : null;

  const expiryMs = expiryToMs(String(body.expiry ?? '24h'));
  if (!expiryMs) return fail(400, 'Unknown expiry window.');

  // Piggyback the cleanup on ordinary traffic so expiry holds without a cron.
  sweepInBackground();

  const drop = await prisma.encryptedDrop.create({
    data: {
      ciphertext,
      iv,
      passwordSalt,
      burnAfterRead: body.burnAfterRead === true,
      expiresAt: new Date(Date.now() + expiryMs),
      // Written explicitly so the field EXISTS as null rather than being
      // absent. On MongoDB an optional field that was never set is missing
      // from the document, and a `readAt: null` filter does not match a
      // missing field - which would make the burn-after-read claim in
      // drops/[id]/open silently match nothing and 404 every first read.
      readAt: null,
    },
  });

  return ok(
    { id: drop.id, expiresAt: drop.expiresAt.toISOString(), burnAfterRead: drop.burnAfterRead },
    { status: 201 }
  );
}
