import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { LIMITS, normaliseHandle } from '@/lib/constants';
import { safeEqual, sha256Base64 } from '@/lib/server-crypto';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ handle: string }> };

const MESSAGE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Send an anonymous, end-to-end encrypted message to someone's inbox. */
export async function POST(request: Request, { params }: Params) {
  const limited = guard(request, 'inbox:send', RATE_LIMITS.sendToInbox);
  if (limited) return limited;

  const { handle } = await params;
  const inbox = await prisma.inbox.findUnique({ where: { handle: normaliseHandle(handle) } });
  if (!inbox) return fail(404, 'No inbox with that handle.');

  const body = await readJson(request);
  if (!body) return fail(400, 'Malformed request.');

  const ciphertext = asString(body.ciphertext, LIMITS.ciphertextMax);
  const iv = asString(body.iv, 64);
  const senderPubKey = asString(body.senderPubKey, 1024);

  if (!ciphertext || !iv || !senderPubKey) return fail(400, 'Missing encrypted payload.');

  await prisma.encryptedDrop.create({
    data: {
      ciphertext,
      iv,
      senderPubKey,
      inboxId: inbox.id,
      expiresAt: new Date(Date.now() + MESSAGE_TTL_MS),
    },
  });

  // Deliberately no count, no timestamp, no confirmation detail returned - a
  // sender should not be able to probe an inbox for activity.
  return ok({ sent: true }, { status: 201 });
}

/**
 * Collect your messages.
 *
 * Proving ownership needs the token whose hash we stored; decrypting them needs
 * the private key we never had. Even a caller who steals the owner token gets
 * nothing but ciphertext.
 */
export async function GET(request: Request, { params }: Params) {
  const limited = guard(request, 'inbox:collect', RATE_LIMITS.read);
  if (limited) return limited;

  const { handle } = await params;
  const token = request.headers.get('x-owner-token-hash');
  if (!token) return fail(401, 'Missing owner token.');

  const inbox = await prisma.inbox.findUnique({ where: { handle: normaliseHandle(handle) } });
  if (!inbox) return fail(404, 'No inbox with that handle.');

  if (!safeEqual(inbox.ownerTokenHash, sha256Base64(token))) return fail(403, 'This inbox is not yours.');

  await prisma.encryptedDrop
    .deleteMany({ where: { inboxId: inbox.id, expiresAt: { lte: new Date() } } })
    .catch(() => {});

  const messages = await prisma.encryptedDrop.findMany({
    where: { inboxId: inbox.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      ciphertext: true,
      iv: true,
      senderPubKey: true,
      createdAt: true,
    },
  });

  return ok({
    handle: inbox.handle,
    publicKey: inbox.publicKey,
    messages: messages.map((m) => ({
      id: m.id,
      ciphertext: m.ciphertext,
      iv: m.iv,
      senderPubKey: m.senderPubKey,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}
