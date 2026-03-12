import prisma from '../config/prisma';
import { getRedis, REDIS_KEYS } from '../config/redis';
import { poolService } from '../services/pool.service';
import { realtimeService } from '../services/realtime.service';
import { sessionService } from '../services/session.service';
import { SecretStatus, PayoutMethod, PayoutStatus } from '@prisma/client';

const WINNER_SHARE = 0.70;
const PLATFORM_SHARE = 0.20;
const VOTERS_SHARE = 0.10;

export async function runDailyPayout(): Promise<void> {
  console.log('[DailyPayout] Starting daily payout job...');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const pool = await poolService.getPoolByDate(today);
  if (!pool) {
    console.warn('[DailyPayout] No pool found for today, creating and skipping payout.');
    await poolService.getOrCreateTodayPool();
    return;
  }

  if (pool.status === 'SETTLED') {
    console.log('[DailyPayout] Pool already settled, skipping.');
    return;
  }

  // Lock pool
  await poolService.lockPool(today);
  console.log(`[DailyPayout] Pool locked: ${pool.id}, total: $${pool.totalAmount}`);

  const totalAmount = Number(pool.totalAmount);
  if (totalAmount <= 0) {
    console.log('[DailyPayout] Empty pool, settling without winner.');
    await poolService.settlePool(pool.id, '', 0);
    return;
  }

  // Find winner from Redis leaderboard
  const dateStr = today.toISOString().split('T')[0];
  const redis = getRedis();
  const topIds = await redis.zrevrange(REDIS_KEYS.leaderboard(dateStr), 0, 0, 'WITHSCORES');

  let winnerId: string | null = null;
  let winnerRankScore = 0;

  if (topIds.length >= 2) {
    winnerId = topIds[0];
    winnerRankScore = parseFloat(topIds[1]);
  } else {
    // Fallback: query DB
    const topSecret = await prisma.secret.findFirst({
      where: {
        poolDate: today,
        status: { in: [SecretStatus.ACTIVE, SecretStatus.PENDING] },
      },
      orderBy: { rankScore: 'desc' },
    });
    if (topSecret) {
      winnerId = topSecret.id;
      winnerRankScore = topSecret.rankScore;
    }
  }

  if (!winnerId) {
    console.log('[DailyPayout] No eligible secrets in pool, settling empty.');
    await poolService.settlePool(pool.id, '', 0);
    return;
  }

  const winnerSecret = await prisma.secret.findUnique({
    where: { id: winnerId },
    include: { session: true },
  });

  if (!winnerSecret) {
    console.error('[DailyPayout] Winner secret not found:', winnerId);
    return;
  }

  const winnerPayout = totalAmount * WINNER_SHARE;
  const platformPayout = totalAmount * PLATFORM_SHARE;
  const votersPayout = totalAmount * VOTERS_SHARE;

  console.log(
    `[DailyPayout] Winner: ${winnerSecret.session.codename}, payout: $${winnerPayout.toFixed(2)}`
  );

  // Create payout record for winner
  await prisma.$transaction(async (tx) => {
    // Mark winner secret
    await tx.secret.update({
      where: { id: winnerId! },
      data: { status: SecretStatus.WINNER },
    });

    // Create winner payout
    await tx.payout.create({
      data: {
        sessionId: winnerSecret.sessionId,
        amount: winnerPayout,
        currency: 'USD',
        method: PayoutMethod.PLATFORM_CREDIT,
        destination: `platform:${winnerSecret.sessionId}`,
        status: PayoutStatus.PROCESSING,
      },
    });

    // Increment winner earnings
    await tx.anonSession.update({
      where: { id: winnerSecret.sessionId },
      data: { earnings: { increment: winnerPayout } },
    });

    // Settle pool
    await tx.dailyPool.update({
      where: { id: pool.id },
      data: {
        status: 'SETTLED',
        winnerSecretId: winnerId,
        winnerPayout,
        settledAt: new Date(),
      },
    });
  });

  // Distribute voters reward
  await distributeVoterRewards(winnerId, votersPayout);

  // Create HallOfFame entry
  const snippet = winnerSecret.isGhost
    ? winnerSecret.hintText ?? 'A ghosted secret won the day...'
    : winnerSecret.content.substring(0, 120) + (winnerSecret.content.length > 120 ? '...' : '');

  await prisma.hallOfFameEntry.create({
    data: {
      secretId: winnerId,
      codename: winnerSecret.session.codename,
      winDate: today,
      prizeAmount: winnerPayout,
      rankScore: winnerRankScore,
      snippet,
      category: winnerSecret.category,
    },
  });

  // Invalidate session cache
  await sessionService.invalidateCache(winnerSecret.sessionId);

  // Announce winner via Socket.io
  await realtimeService.emitWinnerAnnounced({
    winnerSecretId: winnerId,
    codename: winnerSecret.session.codename,
    prizeAmount: winnerPayout,
    rankScore: winnerRankScore,
    snippet,
    category: winnerSecret.category,
    poolDate: dateStr,
  });

  // Publish SSE event
  await redis.publish(
    REDIS_KEYS.sseChannel,
    JSON.stringify({
      type: 'winner:announced',
      data: {
        winnerSecretId: winnerId,
        codename: winnerSecret.session.codename,
        prizeAmount: winnerPayout,
        poolDate: dateStr,
      },
    })
  );

  // Open new pool for tomorrow
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  await prisma.dailyPool.upsert({
    where: { poolDate: tomorrow },
    update: {},
    create: { poolDate: tomorrow },
  });

  console.log(
    `[DailyPayout] Completed. Winner: ${winnerSecret.session.codename}, payout: $${winnerPayout.toFixed(2)}, platform: $${platformPayout.toFixed(2)}`
  );
}

async function distributeVoterRewards(winnerId: string, totalVoterReward: number): Promise<void> {
  const votes = await prisma.vote.findMany({
    where: { secretId: winnerId },
    select: { sessionId: true },
  });

  if (votes.length === 0) return;

  const rewardPerVoter = totalVoterReward / votes.length;

  await prisma.$transaction(
    votes.map((vote) =>
      prisma.anonSession.update({
        where: { id: vote.sessionId },
        data: { earnings: { increment: rewardPerVoter } },
      })
    )
  );

  console.log(
    `[DailyPayout] Distributed $${rewardPerVoter.toFixed(4)} to ${votes.length} voters`
  );
}
