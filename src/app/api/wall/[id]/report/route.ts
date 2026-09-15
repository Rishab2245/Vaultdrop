import { prisma } from '@/lib/db';
import { fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { AUTO_HIDE_REPORT_THRESHOLD, isReportReason } from '@/lib/constants';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/**
 * Report a secret.
 *
 * Reports carry no reporter identity. Past a small threshold the secret is
 * hidden immediately rather than waiting on a human - on an anonymous wall the
 * damage from leaving harassment up for an hour is far worse than the annoyance
 * of a false positive, and the author can still see it in their own vault.
 */
export async function POST(request: Request, { params }: Params) {
  const limited = guard(request, 'wall:report', RATE_LIMITS.report);
  if (limited) return limited;

  const { id } = await params;
  const body = await readJson(request);
  const reason = body?.reason;

  if (!isReportReason(reason)) return fail(400, 'Pick a reason.');

  const secret = await prisma.wallSecret.findUnique({ where: { id } });
  if (!secret) return fail(404, 'That secret is not here.');

  const updated = await prisma.$transaction(async (tx) => {
    await tx.report.create({ data: { wallSecretId: id, reason: reason as string } });
    const next = await tx.wallSecret.update({
      where: { id },
      data: { reportCount: { increment: 1 } },
    });
    if (next.reportCount >= AUTO_HIDE_REPORT_THRESHOLD && !next.hidden) {
      return tx.wallSecret.update({ where: { id }, data: { hidden: true } });
    }
    return next;
  });

  return ok({ reported: true, hidden: updated.hidden });
}
