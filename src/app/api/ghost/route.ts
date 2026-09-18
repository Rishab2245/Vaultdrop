import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { ECONOMY } from '@/lib/economy';
import { codenameFor, presentGhost, recordLedger, resolveGhost } from '@/lib/ghost-server';

export const dynamic = 'force-dynamic';

/**
 * Register a ghost, or re-attach an existing one from a recovery key.
 *
 * The client sends only the hash of its secret and its ECDH public key. We
 * never see the secret at registration - it arrives later in an Authorization
 * header, and even then only transiently.
 */
export async function POST(request: Request) {
  const limited = guard(request, 'ghost:create', RATE_LIMITS.createInbox);
  if (limited) return limited;

  const body = await readJson(request);
  if (!body) return fail(400, 'Malformed request.');

  const id = asString(body.id, 200);
  const publicKey = asString(body.publicKey, 500);

  if (!id || !publicKey) return fail(400, 'A ghost needs an id and a public key.');
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(id)) return fail(400, 'That is not a valid ghost id.');

  const existing = await prisma.ghost.findUnique({ where: { id } });

  // Restoring from a recovery key lands here too. The id is the hash of a
  // secret only the holder has, so re-registering it is proof enough.
  if (existing) return ok({ codename: existing.codename, restored: true });

  const codename = codenameFor(id);

  const ghost = await prisma.ghost.create({
    data: { id, codename, publicKey, keys: ECONOMY.welcomeGrant },
  });

  await recordLedger(prisma, ghost.id, ECONOMY.welcomeGrant, ghost.keys, 'welcome');

  return ok({ codename: ghost.codename, restored: false }, { status: 201 });
}

/** The caller's own ghost: balance, reputation, and recent Key history. */
export async function GET(request: Request) {
  const limited = guard(request, 'ghost:me', RATE_LIMITS.read);
  if (limited) return limited;

  const ghost = await resolveGhost(request);
  if (!ghost) return fail(401, 'No ghost on this request.');

  const [ledger, records, threads] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where: { ghostId: ghost.id },
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
    prisma.wallSecret.count({ where: { ghostId: ghost.id, hidden: false } }),
    prisma.thread.count({
      where: { OR: [{ authorGhostId: ghost.id }, { starterGhostId: ghost.id }], closed: false },
    }),
  ]);

  return ok({
    ghost: presentGhost(ghost),
    records,
    openThreads: threads,
    ledger: ledger.map((entry) => ({
      id: entry.id,
      delta: entry.delta,
      balance: entry.balance,
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}
