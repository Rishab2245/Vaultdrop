import { Secret } from '@prisma/client';
import prisma from '../config/prisma';
import { getRedis, REDIS_KEYS } from '../config/redis';

export class LeaderboardService {
  async getLeaderboard(date?: string, limit = 10): Promise<Secret[]> {
    const dateStr = date ?? new Date().toISOString().split('T')[0];
    const redis = getRedis();
    const key = REDIS_KEYS.leaderboard(dateStr);

    // Try Redis sorted set first
    const redisIds = await redis.zrevrange(key, 0, limit - 1);

    if (redisIds.length > 0) {
      const secrets = await prisma.secret.findMany({
        where: { id: { in: redisIds } },
        include: { bowl: true, session: true },
      });
      // Preserve Redis order
      const idOrder = new Map(redisIds.map((id, i) => [id, i]));
      return secrets.sort((a, b) => (idOrder.get(a.id) ?? 0) - (idOrder.get(b.id) ?? 0));
    }

    // Fallback to DB
    const targetDate = new Date(dateStr);
    targetDate.setUTCHours(0, 0, 0, 0);

    const secrets = await prisma.secret.findMany({
      where: { poolDate: targetDate, status: { in: ['ACTIVE', 'WINNER'] } },
      orderBy: { rankScore: 'desc' },
      take: limit,
      include: { bowl: true, session: true },
    });

    // Populate Redis cache
    if (secrets.length > 0) {
      const pipeline = redis.pipeline();
      for (const secret of secrets) {
        pipeline.zadd(key, secret.rankScore, secret.id);
      }
      pipeline.expire(key, 3600); // 1 hour TTL
      await pipeline.exec();
    }

    return secrets;
  }

  async getHallOfFame(cursor?: string, limit = 20): Promise<{
    items: any[];
    nextCursor: string | null;
  }> {
    const take = Math.min(limit, 50);
    const items = await prisma.hallOfFameEntry.findMany({
      orderBy: { winDate: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    let nextCursor: string | null = null;
    if (items.length > take) {
      const next = items.pop();
      nextCursor = next?.id ?? null;
    }

    return { items, nextCursor };
  }

  async rebuildLeaderboard(date: string): Promise<void> {
    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);

    const secrets = await prisma.secret.findMany({
      where: { poolDate: targetDate, status: { in: ['ACTIVE', 'WINNER'] } },
      select: { id: true, rankScore: true },
    });

    const redis = getRedis();
    const key = REDIS_KEYS.leaderboard(date);
    await redis.del(key);

    if (secrets.length > 0) {
      const pipeline = redis.pipeline();
      for (const secret of secrets) {
        pipeline.zadd(key, secret.rankScore, secret.id);
      }
      pipeline.expire(key, 3600);
      await pipeline.exec();
    }
  }
}

export const leaderboardService = new LeaderboardService();
