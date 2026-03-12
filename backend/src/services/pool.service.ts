import { DailyPool, PoolStatus } from '@prisma/client';
import prisma from '../config/prisma';
import { getRedis, REDIS_KEYS } from '../config/redis';

export class PoolService {
  async getOrCreateTodayPool(): Promise<DailyPool> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const existing = await prisma.dailyPool.findUnique({
      where: { poolDate: today },
    });

    if (existing) return existing;

    return prisma.dailyPool.create({
      data: { poolDate: today },
    });
  }

  async addEntryToPool(secretId: string, poolDate: Date, entryFee: number): Promise<void> {
    const pool = await this.getOrCreateTodayPool();

    await prisma.$transaction([
      prisma.poolEntry.create({
        data: {
          poolId: pool.id,
          secretId,
          entryFee,
        },
      }),
      prisma.dailyPool.update({
        where: { id: pool.id },
        data: { totalAmount: { increment: entryFee } },
      }),
    ]);

    // Update Redis cache for pool total
    const redis = getRedis();
    const dateStr = poolDate.toISOString().split('T')[0];
    await redis.incrbyfloat(REDIS_KEYS.poolTotal(dateStr), entryFee);
    await redis.incr(REDIS_KEYS.poolEntryCount(dateStr));

    // Broadcast SSE update
    await redis.publish(
      REDIS_KEYS.poolUpdateChannel,
      JSON.stringify({
        type: 'pool:updated',
        data: {
          poolDate: dateStr,
          totalAmount: await redis.get(REDIS_KEYS.poolTotal(dateStr)),
        },
      })
    );
  }

  async addPeekFeeToPool(secretId: string, fee: number): Promise<void> {
    const entry = await prisma.poolEntry.findUnique({ where: { secretId } });
    if (!entry) return;

    await prisma.$transaction([
      prisma.poolEntry.update({
        where: { secretId },
        data: { peekFees: { increment: fee } },
      }),
      prisma.dailyPool.update({
        where: { id: entry.poolId },
        data: { totalAmount: { increment: fee } },
      }),
    ]);

    const pool = await prisma.dailyPool.findUnique({ where: { id: entry.poolId } });
    if (pool) {
      const dateStr = pool.poolDate.toISOString().split('T')[0];
      const redis = getRedis();
      await redis.incrbyfloat(REDIS_KEYS.poolTotal(dateStr), fee);
    }
  }

  async getCurrentPool(): Promise<{
    id: string;
    poolDate: string;
    totalAmount: number;
    status: PoolStatus;
    entryCount: number;
    timeUntilDrawMs: number;
  }> {
    const pool = await this.getOrCreateTodayPool();
    const entryCount = await prisma.poolEntry.count({ where: { poolId: pool.id } });

    const now = new Date();
    const drawTime = new Date(now);
    drawTime.setUTCHours(23, 58, 0, 0);
    if (drawTime < now) {
      drawTime.setUTCDate(drawTime.getUTCDate() + 1);
    }

    const timeUntilDrawMs = drawTime.getTime() - now.getTime();

    return {
      id: pool.id,
      poolDate: pool.poolDate.toISOString().split('T')[0],
      totalAmount: Number(pool.totalAmount),
      status: pool.status,
      entryCount,
      timeUntilDrawMs,
    };
  }

  async getPoolHistory(limit = 10): Promise<DailyPool[]> {
    return prisma.dailyPool.findMany({
      where: { status: PoolStatus.SETTLED },
      orderBy: { poolDate: 'desc' },
      take: limit,
    });
  }

  async lockPool(poolDate: Date): Promise<DailyPool> {
    return prisma.dailyPool.update({
      where: { poolDate },
      data: { status: PoolStatus.CALCULATING },
    });
  }

  async settlePool(
    poolId: string,
    winnerSecretId: string,
    winnerPayout: number
  ): Promise<DailyPool> {
    return prisma.dailyPool.update({
      where: { id: poolId },
      data: {
        status: PoolStatus.SETTLED,
        winnerSecretId,
        winnerPayout,
        settledAt: new Date(),
      },
    });
  }

  async getPoolByDate(date: Date): Promise<DailyPool | null> {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return prisma.dailyPool.findUnique({ where: { poolDate: d } });
  }
}

export const poolService = new PoolService();
