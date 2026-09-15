import { prisma } from '@/lib/db';
import { fail, guard, ok } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { normaliseHandle } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ handle: string }> };

/** Public key lookup, so a stranger can encrypt a message to this inbox. */
export async function GET(request: Request, { params }: Params) {
  const limited = guard(request, 'inbox:read', RATE_LIMITS.read);
  if (limited) return limited;

  const { handle } = await params;
  const inbox = await prisma.inbox.findUnique({
    where: { handle: normaliseHandle(handle) },
    select: { handle: true, publicKey: true, createdAt: true },
  });

  if (!inbox) return fail(404, 'No inbox with that handle.');

  return ok({
    handle: inbox.handle,
    publicKey: inbox.publicKey,
    createdAt: inbox.createdAt.toISOString(),
  });
}
