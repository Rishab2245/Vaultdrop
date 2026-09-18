import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { LIMITS } from '@/lib/constants';
import { resolveGhost } from '@/lib/ghost-server';

export const dynamic = 'force-dynamic';

/** Both sides of a thread, plus the counterpart's key so replies can be sealed. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'thread:read', RATE_LIMITS.read);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'No ghost on this request.');

  const { id } = await params;

  const thread = await prisma.thread.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, codename: true, publicKey: true } },
      starter: { select: { id: true, codename: true, publicKey: true } },
      secret: { select: { id: true, mood: true, body: true, teaser: true, isLocked: true } },
      messages: { orderBy: { createdAt: 'asc' }, take: 200 },
    },
  });

  if (!thread) return fail(404, 'No such thread.');

  const isAuthor = thread.authorGhostId === ghost.id;
  const isStarter = thread.starterGhostId === ghost.id;
  if (!isAuthor && !isStarter) return fail(403, 'That thread is not yours.');

  const other = isAuthor ? thread.starter : thread.author;

  return ok({
    thread: {
      id: thread.id,
      closed: thread.closed,
      role: isAuthor ? 'author' : 'starter',
      createdAt: thread.createdAt.toISOString(),
    },
    other: { codename: other.codename, publicKey: other.publicKey },
    secret: {
      id: thread.secret.id,
      mood: thread.secret.mood,
      preview: thread.secret.isLocked
        ? (thread.secret.teaser ?? '')
        : thread.secret.body.slice(0, 280),
    },
    messages: thread.messages.map((message) => ({
      id: message.id,
      mine: message.senderGhostId === ghost.id,
      ciphertext: message.ciphertext,
      iv: message.iv,
      senderPubKey: message.senderPubKey,
      createdAt: message.createdAt.toISOString(),
    })),
  });
}

/** Add a sealed message to a thread. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'thread:send', RATE_LIMITS.sendToInbox);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'No ghost on this request.');

  const { id } = await params;
  const body = await readJson(request);
  if (!body) return fail(400, 'Malformed request.');

  const ciphertext = asString(body.ciphertext, LIMITS.ciphertextMax);
  const iv = asString(body.iv, 64);
  const senderPubKey = asString(body.senderPubKey, 500);
  if (!ciphertext || !iv || !senderPubKey) return fail(400, 'Missing the sealed message.');

  const thread = await prisma.thread.findUnique({ where: { id } });
  if (!thread) return fail(404, 'No such thread.');

  if (thread.authorGhostId !== ghost.id && thread.starterGhostId !== ghost.id) {
    return fail(403, 'That thread is not yours.');
  }
  if (thread.closed) return fail(409, 'That thread is closed.');

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.threadMessage.create({
      data: { threadId: id, senderGhostId: ghost.id, ciphertext, iv, senderPubKey },
    });
    await tx.thread.update({ where: { id }, data: { lastMessageAt: new Date() } });
    return created;
  });

  return ok({ id: message.id, createdAt: message.createdAt.toISOString() }, { status: 201 });
}

/** Either side can close a thread. Closing is final and stops new messages. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'thread:close', RATE_LIMITS.react);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'No ghost on this request.');

  const { id } = await params;
  const thread = await prisma.thread.findUnique({ where: { id } });
  if (!thread) return fail(404, 'No such thread.');

  if (thread.authorGhostId !== ghost.id && thread.starterGhostId !== ghost.id) {
    return fail(403, 'That thread is not yours.');
  }

  await prisma.thread.update({ where: { id }, data: { closed: true } });
  return ok({ closed: true });
}
