import { Bowl, BowlMembership, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { generateSlug } from '../utils/crypto';

export interface CreateBowlInput {
  name: string;
  description?: string;
  coverEmoji?: string;
  isPrivate?: boolean;
  entryFee?: number;
  creatorSessionId: string;
}

export class BowlService {
  async createBowl(input: CreateBowlInput): Promise<Bowl> {
    const slug = generateSlug(input.name);

    const bowl = await prisma.bowl.create({
      data: {
        slug,
        name: input.name,
        description: input.description,
        coverEmoji: input.coverEmoji ?? '🏺',
        isPrivate: input.isPrivate ?? false,
        entryFee: input.entryFee,
        creatorSessionId: input.creatorSessionId,
        memberCount: 1,
      },
    });

    // Auto-join creator
    await prisma.bowlMembership.create({
      data: {
        bowlId: bowl.id,
        sessionId: input.creatorSessionId,
      },
    });

    return bowl;
  }

  async getBowlBySlug(slug: string, sessionId?: string): Promise<(Bowl & { isMember: boolean }) | null> {
    const bowl = await prisma.bowl.findUnique({ where: { slug } });
    if (!bowl) return null;

    let isMember = false;
    if (sessionId) {
      const membership = await prisma.bowlMembership.findUnique({
        where: { bowlId_sessionId: { bowlId: bowl.id, sessionId } },
      });
      isMember = !!membership;
    }

    return { ...bowl, isMember };
  }

  async getBowls(options: {
    cursor?: string;
    limit?: number;
    isPrivate?: boolean;
    sessionId?: string;
  }): Promise<{ items: (Bowl & { isMember: boolean })[]; nextCursor: string | null }> {
    const take = Math.min(options.limit ?? 20, 50);
    const where: Prisma.BowlWhereInput = {};

    if (options.isPrivate !== undefined) {
      where.isPrivate = options.isPrivate;
    } else {
      where.isPrivate = false;
    }

    const items = await prisma.bowl.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (items.length > take) {
      const next = items.pop();
      nextCursor = next?.id ?? null;
    }

    // Attach isMember flag
    const membershipSet = new Set<string>();
    if (options.sessionId && items.length > 0) {
      const memberships = await prisma.bowlMembership.findMany({
        where: {
          sessionId: options.sessionId,
          bowlId: { in: items.map((b) => b.id) },
        },
        select: { bowlId: true },
      });
      memberships.forEach((m) => membershipSet.add(m.bowlId));
    }

    const enriched = items.map((b) => ({ ...b, isMember: membershipSet.has(b.id) }));
    return { items: enriched, nextCursor };
  }

  async joinBowl(bowlId: string, sessionId: string, txId?: string): Promise<BowlMembership> {
    const bowl = await prisma.bowl.findUnique({ where: { id: bowlId } });
    if (!bowl) throw new Error('Bowl not found');

    const existing = await prisma.bowlMembership.findUnique({
      where: { bowlId_sessionId: { bowlId, sessionId } },
    });
    if (existing) throw new Error('Already a member of this bowl');

    const [membership] = await prisma.$transaction([
      prisma.bowlMembership.create({
        data: { bowlId, sessionId, txId },
      }),
      prisma.bowl.update({
        where: { id: bowlId },
        data: { memberCount: { increment: 1 } },
      }),
    ]);

    return membership;
  }

  async incrementSecretCount(bowlId: string): Promise<void> {
    await prisma.bowl.update({
      where: { id: bowlId },
      data: { secretCount: { increment: 1 } },
    });
  }
}

export const bowlService = new BowlService();
