import { prisma } from '@/lib/db';
import { fail, guard, ok } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * Hand over the ciphertext, and for a one-time drop, destroy it.
 *
 * The claim is a conditional update rather than a read-then-write, so two
 * people opening the same burn link at the same instant cannot both win: the
 * database decides, and exactly one caller gets the payload.
 *
 * The client keeps the ciphertext in memory afterwards, which is what makes it
 * safe to delete here - a wrong passphrase can be retried locally without the
 * secret having to survive on the server for a second attempt.
 */
export async function POST(request: Request, { params }: Params) {
  const limited = guard(request, 'drops:open', RATE_LIMITS.read);
  if (limited) return limited;

  const { id } = await params;
  const drop = await prisma.encryptedDrop.findUnique({ where: { id } });

  if (!drop) return fail(404, 'gone');

  if (drop.expiresAt.getTime() <= Date.now()) {
    await prisma.encryptedDrop.delete({ where: { id } }).catch(() => {});
    return fail(404, 'gone');
  }

  const payload = {
    ciphertext: drop.ciphertext,
    iv: drop.iv,
    ...(drop.passwordSalt ? { passwordSalt: drop.passwordSalt } : {}),
    burnAfterRead: drop.burnAfterRead,
  };

  if (!drop.burnAfterRead) return ok(payload);

  const claimed = await prisma.encryptedDrop.updateMany({
    where: { id, readAt: null },
    data: { readAt: new Date() },
  });
  if (claimed.count !== 1) return fail(404, 'gone');

  // Won the race. The ciphertext is on its way to the reader, so remove it.
  await prisma.encryptedDrop.delete({ where: { id } }).catch(() => {});

  return ok({ ...payload, burned: true });
}
