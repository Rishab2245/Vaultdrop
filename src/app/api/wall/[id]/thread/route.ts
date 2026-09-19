import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { LIMITS } from '@/lib/constants';
import { resolveGhost } from '@/lib/ghost-server';
import { isValidEcdhPublicKey } from '@/lib/public-key';

export const dynamic = 'force-dynamic';

/**
 * Open a private thread with the author of a record you marked "same" on.
 *
 * This is the part of the product that has nothing to do with Keys. The reason
 * people confess is rarely the audience - it is the hope that somebody else has
 * been here too. Finding that person is the payoff, and it is worth more than
 * any currency we could mint.
 *
 * Messages are sealed to each side's ECDH key, so this server routes a
 * conversation it cannot read, between two people who cannot identify each
 * other.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'thread:create', RATE_LIMITS.sendToInbox);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'You need a ghost to start a thread.');

  const { id } = await params;
  const body = await readJson(request);
  if (!body) return fail(400, 'Malformed request.');

  const ciphertext = asString(body.ciphertext, LIMITS.ciphertextMax);
  const iv = asString(body.iv, 64);
  const senderPubKey = asString(body.senderPubKey, 500);

  if (!ciphertext || !iv || !senderPubKey) return fail(400, 'Missing the sealed message.');

  const secret = await prisma.wallSecret.findUnique({
    where: { id },
    include: { ghost: { select: { id: true, codename: true, publicKey: true } } },
  });

  if (!secret || secret.hidden) return fail(404, 'No such record.');
  if (!secret.ghost) {
    return fail(400, 'That record was filed anonymously, so there is no one to reach.');
  }
  if (secret.ghost.id === ghost.id) return fail(400, 'That is your own record.');

  const existing = await prisma.thread.findUnique({
    where: { secretId_starterGhostId: { secretId: id, starterGhostId: ghost.id } },
  });
  if (existing) return ok({ threadId: existing.id, existing: true });

  const thread = await prisma.$transaction(async (tx) => {
    const created = await tx.thread.create({
      data: {
        secretId: id,
        authorGhostId: secret.ghost!.id,
        starterGhostId: ghost.id,
      },
    });

    await tx.threadMessage.create({
      data: {
        threadId: created.id,
        senderGhostId: ghost.id,
        ciphertext,
        iv,
        senderPubKey,
      },
    });

    return created;
  });

  return ok({ threadId: thread.id, existing: false }, { status: 201 });
}

/** The recipient's public key, so the client can seal a message before sending. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = guard(request, 'thread:key', RATE_LIMITS.read);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  const { id } = await params;

  const secret = await prisma.wallSecret.findUnique({
    where: { id },
    include: { ghost: { select: { id: true, codename: true, publicKey: true } } },
  });

  if (!secret || secret.hidden) return fail(404, 'No such record.');
  if (!secret.ghost) return ok({ reachable: false });

  // Records predating key validation may carry an unusable key. Better to say
  // the author cannot be reached than to offer a button that throws.
  if (!isValidEcdhPublicKey(secret.ghost.publicKey)) {
    return ok({ reachable: false, reason: 'unusable_key' });
  }

  const existing = ghost
    ? await prisma.thread.findUnique({
        where: { secretId_starterGhostId: { secretId: id, starterGhostId: ghost.id } },
      })
    : null;

  return ok({
    reachable: secret.ghost.id !== ghost?.id,
    codename: secret.ghost.codename,
    publicKey: secret.ghost.publicKey,
    existingThreadId: existing?.id ?? null,
  });
}
