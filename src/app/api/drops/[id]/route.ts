import { prisma } from '@/lib/db';
import { fail, guard, ok } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * Describe a drop without handing over the ciphertext.
 *
 * This split exists because chat apps fetch every link you paste to build a
 * preview. If reading the drop and burning it were the same request, Slack or
 * WhatsApp would silently destroy a one-time secret before its recipient ever
 * saw it. So GET is always safe, and burning happens only on the explicit
 * POST to /open that a human triggers.
 */
export async function GET(request: Request, { params }: Params) {
  const limited = guard(request, 'drops:read', RATE_LIMITS.read);
  if (limited) return limited;

  const { id } = await params;
  const drop = await prisma.encryptedDrop.findUnique({ where: { id } });

  if (!drop) return fail(404, 'gone');

  if (drop.expiresAt.getTime() <= Date.now()) {
    await prisma.encryptedDrop.delete({ where: { id } }).catch(() => {});
    return fail(404, 'gone');
  }

  if (drop.burnAfterRead && drop.readAt) return fail(404, 'gone');

  return ok({
    id: drop.id,
    burnAfterRead: drop.burnAfterRead,
    needsPassphrase: drop.passwordSalt !== null,
    expiresAt: drop.expiresAt.toISOString(),
  });
}
