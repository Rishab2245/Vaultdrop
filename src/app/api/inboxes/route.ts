import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { validateHandle } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * Claim an inbox handle.
 *
 * The caller supplies a public key they generated locally. We store that and a
 * hash of their owner token. We never see the private key, so we could not read
 * their messages even under subpoena - and neither can anyone who steals this
 * database.
 */
export async function POST(request: Request) {
  const limited = guard(request, 'inbox:create', RATE_LIMITS.createInbox);
  if (limited) return limited;

  const body = await readJson(request);
  if (!body) return fail(400, 'Malformed request.');

  const check = validateHandle(String(body.handle ?? ''));
  if (!check.ok) return fail(400, check.error);

  const publicKey = asString(body.publicKey, 1024);
  const ownerTokenHash = asString(body.ownerTokenHash, 128);
  if (!publicKey || !ownerTokenHash) return fail(400, 'Missing key material.');

  const taken = await prisma.inbox.findUnique({ where: { handle: check.handle } });
  if (taken) return fail(409, 'That handle is taken.');

  try {
    const inbox = await prisma.inbox.create({
      data: { handle: check.handle, publicKey, ownerTokenHash },
    });
    return ok({ handle: inbox.handle, createdAt: inbox.createdAt.toISOString() }, { status: 201 });
  } catch {
    // Unique constraint lost a race with a concurrent claim.
    return fail(409, 'That handle is taken.');
  }
}
