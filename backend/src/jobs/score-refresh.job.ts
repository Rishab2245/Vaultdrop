import prisma from '../config/prisma';
import { secretService } from '../services/secret.service';
import { leaderboardService } from '../services/leaderboard.service';
import { SecretStatus } from '@prisma/client';

export async function runScoreRefresh(): Promise<void> {
  console.log('[ScoreRefresh] Starting score refresh job...');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Get all active secrets for today
  const secrets = await prisma.secret.findMany({
    where: {
      poolDate: today,
      status: { in: [SecretStatus.ACTIVE, SecretStatus.PENDING] },
    },
    select: { id: true },
  });

  console.log(`[ScoreRefresh] Refreshing scores for ${secrets.length} secrets`);

  let refreshed = 0;
  let errors = 0;

  // Process in batches to avoid overwhelming the DB
  const batchSize = 50;
  for (let i = 0; i < secrets.length; i += batchSize) {
    const batch = secrets.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async ({ id }) => {
        try {
          await secretService.refreshRankScore(id);
          refreshed++;
        } catch (err: any) {
          errors++;
          console.error(`[ScoreRefresh] Failed to refresh secret ${id}:`, err.message);
        }
      })
    );

    // Brief pause between batches
    if (i + batchSize < secrets.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Rebuild leaderboard in Redis
  const dateStr = today.toISOString().split('T')[0];
  await leaderboardService.rebuildLeaderboard(dateStr);

  console.log(
    `[ScoreRefresh] Completed. Refreshed: ${refreshed}, Errors: ${errors}`
  );
}
