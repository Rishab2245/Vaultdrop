import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { screenWallBody } from '@/lib/moderation';
import { standingOf } from '@/lib/economy';
import { resolveGhost } from '@/lib/ghost-server';

export const dynamic = 'force-dynamic';

const MAX_BODY = 500;
const PAGE = 100;

interface CommentRow {
  id: string;
  body: string;
  parentId: string | null;
  createdAt: Date;
  ghostId: string;
  ghost: { codename: string; worthItCount: number; notWorthCount: number };
}

function present(row: CommentRow, viewerGhostId: string | null, authorGhostId: string | null) {
  return {
    id: row.id,
    body: row.body,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
    author: {
      codename: row.ghost.codename,
      standing: standingOf(row.ghost.worthItCount, row.ghost.notWorthCount),
    },
    // Flags the UI needs, computed here so the client never has to compare ids
    // it should not be holding in the first place.
    mine: viewerGhostId !== null && row.ghostId === viewerGhostId,
    byRecordAuthor: authorGhostId !== null && row.ghostId === authorGhostId,
  };
}

/** Replies on a record, oldest first, with one level of nesting. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'comments:read', RATE_LIMITS.read);
  if (limited) return limited;

  const { id } = await params;

  const secret = await prisma.wallSecret.findUnique({
    where: { id },
    select: { id: true, hidden: true, ghostId: true, commentsLocked: true },
  });
  if (!secret || secret.hidden) return fail(404, 'That record is not here.');

  const ghost = await resolveGhost(request);

  const rows = await prisma.comment.findMany({
    where: { secretId: id, hidden: false },
    orderBy: { createdAt: 'asc' },
    take: PAGE,
    include: { ghost: { select: { codename: true, worthItCount: true, notWorthCount: true } } },
  });

  return ok({
    locked: secret.commentsLocked,
    isRecordAuthor: ghost !== null && ghost.id === secret.ghostId,
    comments: rows.map((row) => present(row, ghost?.id ?? null, secret.ghostId)),
  });
}

/**
 * Reply to a record.
 *
 * A ghost is required. Filing a confession anonymously is the product; aiming
 * a message at the person who wrote one is where these platforms turn into
 * harassment engines, so a reply carries a standing even though it still names
 * nobody.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'comments:write', RATE_LIMITS.sendToInbox);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'You need a ghost to reply.');

  const { id } = await params;
  const payload = await readJson(request);
  if (!payload) return fail(400, 'Malformed request.');

  const raw = asString(payload.body, MAX_BODY);
  if (!raw || raw.length < 2) return fail(400, `Say something, under ${MAX_BODY} characters.`);

  const secret = await prisma.wallSecret.findUnique({
    where: { id },
    select: { id: true, hidden: true, commentsLocked: true },
  });
  if (!secret || secret.hidden) return fail(404, 'That record is not here.');
  if (secret.commentsLocked) return fail(409, 'The author has closed this record to replies.');

  // Replies are screened exactly like records. A reply is more likely to name
  // someone than a confession is, not less.
  const verdict = screenWallBody(raw);
  if (verdict.action === 'block') return fail(422, verdict.reason);

  // One level of nesting: a reply to a reply attaches to its parent's parent.
  let parentId: string | null = null;
  const requestedParent = asString(payload.parentId, 64);
  if (requestedParent) {
    const parent = await prisma.comment.findUnique({
      where: { id: requestedParent },
      select: { id: true, secretId: true, parentId: true },
    });
    if (parent && parent.secretId === id) parentId = parent.parentId ?? parent.id;
  }

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { secretId: id, ghostId: ghost.id, body: verdict.body, parentId },
      include: { ghost: { select: { codename: true, worthItCount: true, notWorthCount: true } } },
    });
    await tx.wallSecret.update({
      where: { id },
      data: { commentCount: { increment: 1 } },
    });
    return created;
  });

  return ok(
    {
      comment: present(comment, ghost.id, null),
      redactions: verdict.redactions,
    },
    { status: 201 }
  );
}
