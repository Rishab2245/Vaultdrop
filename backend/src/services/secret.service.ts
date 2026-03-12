import { Secret, SecretCategory, SecretStatus, Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { getRedis, REDIS_KEYS } from '../config/redis';
import { calculateRankScore } from '../utils/rankScore';
import { vaultAIService } from './vault-ai.service';
import { poolService } from './pool.service';

const SECRET_CACHE_TTL = 60;

export interface SubmitSecretInput {
  category: SecretCategory;
  content: string;
  hintText?: string;
  isGhost: boolean;
  peekPrice?: number;
  unlockPrice?: number;
  bowlId?: string;
  paymentIntentId: string;
  sessionId: string;
  entryFeePaid: number;
  mediaUrl?: string;
  mediaType?: string;
  linkUrl?: string;
  linkTitle?: string;
  linkDomain?: string;
}

export interface FeedOptions {
  date?: string;
  category?: SecretCategory;
  sort?: string;
  cursor?: string;
  limit?: number;
  sessionId?: string;
  ghostOnly?: boolean;
  bowlSlug?: string;
}

export class SecretService {
  async submitSecret(input: SubmitSecretInput): Promise<Secret> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const secret = await prisma.secret.create({
      data: {
        sessionId: input.sessionId,
        category: input.category,
        content: input.content,
        hintText: input.hintText,
        isGhost: input.isGhost,
        peekPrice: input.peekPrice,
        unlockPrice: input.unlockPrice,
        bowlId: input.bowlId,
        status: SecretStatus.ACTIVE,
        poolDate: today,
        entryFeePaid: input.entryFeePaid,
        entryTxId: input.paymentIntentId,
        mediaUrl: input.mediaUrl,
        mediaType: input.mediaType,
        linkUrl: input.linkUrl,
        linkTitle: input.linkTitle,
        linkDomain: input.linkDomain,
      },
    });

    // Add to today's pool
    await poolService.addEntryToPool(secret.id, today, input.entryFeePaid);

    // Queue AI scoring
    await vaultAIService.queueScoring(secret.id, secret.content, secret.category);

    return secret;
  }

  async getSecretById(id: string, sessionId?: string): Promise<(Secret & { hasVoted: boolean; hasPeeked: boolean; hasUnlocked: boolean }) | null> {
    const redis = getRedis();
    const cached = await redis.get(REDIS_KEYS.secretCache(id));
    let secret: Secret | null = cached ? JSON.parse(cached) : null;

    if (!secret) {
      secret = await prisma.secret.findUnique({
        where: { id },
        include: { bowl: true, session: true },
      });
      if (secret) {
        await redis.setex(REDIS_KEYS.secretCache(id), SECRET_CACHE_TTL, JSON.stringify(secret));
      }
    }

    if (!secret) return null;

    let hasVoted = false;
    let hasPeeked = false;
    let hasUnlocked = false;

    if (sessionId) {
      const [vote, peek, unlock] = await Promise.all([
        prisma.vote.findUnique({ where: { secretId_sessionId: { secretId: id, sessionId } } }),
        prisma.peek.findUnique({
          where: { secretId_sessionId_type: { secretId: id, sessionId, type: 'PEEK' } },
        }),
        prisma.peek.findUnique({
          where: { secretId_sessionId_type: { secretId: id, sessionId, type: 'UNLOCK' } },
        }),
      ]);
      hasVoted = !!vote;
      hasPeeked = !!peek;
      hasUnlocked = !!unlock;
    }

    return { ...secret, hasVoted, hasPeeked, hasUnlocked };
  }

  async getFeed(options: FeedOptions): Promise<{ items: Secret[]; nextCursor: string | null; total: number }> {
    const limit = Math.min(options.limit ?? 20, 50);
    const sort = options.sort ?? 'rank';

    const where: Prisma.SecretWhereInput = {
      status: { in: [SecretStatus.ACTIVE, SecretStatus.WINNER] },
    };

    if (options.date) {
      const d = new Date(options.date);
      d.setUTCHours(0, 0, 0, 0);
      where.poolDate = d;
    }

    if (options.category) {
      where.category = options.category;
    }

    if (options.ghostOnly) {
      where.isGhost = true;
    }

    if (options.bowlSlug) {
      where.bowl = { slug: options.bowlSlug };
    }

    let orderBy: Prisma.SecretOrderByWithRelationInput;
    if (sort === 'rank') {
      orderBy = { rankScore: 'desc' };
    } else if (sort === 'new') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'votes') {
      orderBy = { voteCount: 'desc' };
    } else {
      orderBy = { rankScore: 'desc' };
    }

    let cursorCondition: Prisma.SecretWhereInput | undefined;
    if (options.cursor) {
      const cursorSecret = await prisma.secret.findUnique({ where: { id: options.cursor } });
      if (cursorSecret) {
        if (sort === 'rank') {
          cursorCondition = { rankScore: { lt: cursorSecret.rankScore } };
        } else if (sort === 'new') {
          cursorCondition = { createdAt: { lt: cursorSecret.createdAt } };
        } else {
          cursorCondition = { voteCount: { lt: cursorSecret.voteCount } };
        }
      }
    }

    const finalWhere = cursorCondition ? { AND: [where, cursorCondition] } : where;

    const [items, total] = await Promise.all([
      prisma.secret.findMany({
        where: finalWhere,
        orderBy,
        take: limit + 1,
        include: { bowl: true, session: true },
      }),
      prisma.secret.count({ where }),
    ]);

    let nextCursor: string | null = null;
    if (items.length > limit) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id ?? null;
    }

    return { items, nextCursor, total };
  }

  async getMySecrets(
    sessionId: string,
    cursor?: string,
    limit = 20
  ): Promise<{ items: Secret[]; nextCursor: string | null; total: number }> {
    const take = Math.min(limit, 50);
    const where: Prisma.SecretWhereInput = { sessionId };

    const items = await prisma.secret.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { bowl: true, session: true },
    });

    const total = await prisma.secret.count({ where });
    let nextCursor: string | null = null;
    if (items.length > take) {
      const next = items.pop();
      nextCursor = next?.id ?? null;
    }

    return { items, nextCursor, total };
  }

  async incrementShareCount(secretId: string): Promise<void> {
    await prisma.secret.update({
      where: { id: secretId },
      data: { shareCount: { increment: 1 } },
    });
    await this.invalidateCache(secretId);
    await this.refreshRankScore(secretId);
  }

  async reportSecret(secretId: string, reason: string, detail?: string): Promise<void> {
    const validReasons = ['FAKE', 'ILLEGAL', 'PII_LEAK', 'SPAM', 'OTHER'];
    if (!validReasons.includes(reason)) {
      throw new Error('Invalid report reason');
    }

    await prisma.$transaction([
      prisma.report.create({
        data: {
          secretId,
          reason: reason as any,
          detail,
        },
      }),
      prisma.secret.update({
        where: { id: secretId },
        data: { reportCount: { increment: 1 } },
      }),
    ]);

    await this.invalidateCache(secretId);
    await this.refreshRankScore(secretId);
  }

  async refreshRankScore(secretId: string): Promise<number> {
    const secret = await prisma.secret.findUnique({ where: { id: secretId } });
    if (!secret) throw new Error('Secret not found');

    const score = calculateRankScore({
      voteCount: secret.voteCount,
      aiExplosiveScore: secret.aiExplosiveScore,
      commentCount: secret.commentCount,
      peekCount: secret.peekCount,
      unlockCount: secret.unlockCount,
      reactionCount: secret.reactionCount,
      shareCount: secret.shareCount,
      reportCount: secret.reportCount,
      peekPrice: secret.peekPrice,
    });

    await prisma.secret.update({
      where: { id: secretId },
      data: { rankScore: score },
    });

    // Update leaderboard in Redis
    if (secret.poolDate) {
      const redis = getRedis();
      const dateStr = secret.poolDate.toISOString().split('T')[0];
      await redis.zadd(REDIS_KEYS.leaderboard(dateStr), score, secretId);
    }

    await this.invalidateCache(secretId);
    return score;
  }

  async updateAIScores(
    secretId: string,
    aiModerationScore: number,
    aiExplosiveScore: number
  ): Promise<void> {
    await prisma.secret.update({
      where: { id: secretId },
      data: { aiModerationScore, aiExplosiveScore },
    });
    await this.invalidateCache(secretId);
    await this.refreshRankScore(secretId);
  }

  async invalidateCache(secretId: string): Promise<void> {
    const redis = getRedis();
    await redis.del(REDIS_KEYS.secretCache(secretId));
  }
}

export const secretService = new SecretService();
