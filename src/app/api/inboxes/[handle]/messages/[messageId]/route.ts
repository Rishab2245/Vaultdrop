import { prisma } from '@/lib/db';
import { fail, guard, ok } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { normaliseHandle } from '@/lib/constants';
import { safeEqual, sha256Base64 } from '@/lib/server-crypto';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ handle: string; messageId: string }> };

/** Delete one message from your own inbox. */
export async function DELETE(request: Request, { params }: Params) {
  const limited = guard(request, 'inbox:delete', RATE_LIMITS.read);
  if (limited) return limited;

  const { handle, messageId } = await params;
  const token = request.headers.get('x-owner-token-hash');
  if (!token) return fail(401, 'Missing owner token.');

  const inbox = await prisma.inbox.findUnique({ where: { handle: normaliseHandle(handle) } });
  if (!inbox) return fail(404, 'No inbox with that handle.');
  if (!safeEqual(inbox.ownerTokenHash, sha256Base64(token))) return fail(403, 'This inbox is not yours.');

  // Scoped to the inbox so an owner token cannot reach another inbox's message.
  const result = await prisma.encryptedDrop.deleteMany({
    where: { id: messageId, inboxId: inbox.id },
  });

  if (result.count === 0) return fail(404, 'That message is already gone.');
  return ok({ deleted: true });
}
