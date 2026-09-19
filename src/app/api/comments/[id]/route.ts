import { prisma } from '@/lib/db';
import { fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { AUTO_HIDE_REPORT_THRESHOLD } from '@/lib/constants';
import { resolveGhost } from '@/lib/ghost-server';

export const dynamic = 'force-dynamic';

/**
 * Delete a reply.
 *
 * Two people may: whoever wrote it, and whoever wrote the record it sits under.
 * The second is the important one - someone who confesses something painful
 * should not have to petition us to get an unkind reply off their own record.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'comments:delete', RATE_LIMITS.react);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'No ghost on this request.');

  const { id } = await params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    include: { secret: { select: { id: true, ghostId: true } } },
  });
  if (!comment) return fail(404, 'No such reply.');

  const isWriter = comment.ghostId === ghost.id;
  const isRecordAuthor = comment.secret.ghostId !== null && comment.secret.ghostId === ghost.id;
  if (!isWriter && !isRecordAuthor) return fail(403, 'That is not yours to remove.');

  await prisma.$transaction(async (tx) => {
    await tx.comment.delete({ where: { id } });
    await tx.wallSecret.update({
      where: { id: comment.secretId },
      data: { commentCount: { decrement: 1 } },
    });
  });

  return ok({ deleted: true, removedBy: isWriter ? 'writer' : 'record_author' });
}

/** Flag a reply. Enough flags hide it pending review, as on the Wall itself. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'comments:report', RATE_LIMITS.report);
  if (limited) return limited;

  const { id } = await params;
  const body = await readJson(request);
  if (body?.action !== 'report') return fail(400, 'Unknown action.');

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, reportCount: true },
  });
  if (!comment) return fail(404, 'No such reply.');

  const reportCount = comment.reportCount + 1;
  await prisma.comment.update({
    where: { id },
    data: { reportCount, hidden: reportCount >= AUTO_HIDE_REPORT_THRESHOLD },
  });

  // The acknowledgement is for the reporter; whether it hid is not their business.
  return ok({ reported: true });
}
