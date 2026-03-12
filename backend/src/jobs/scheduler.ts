import cron from 'node-cron';
import { runDailyPayout } from './daily-payout.job';
import { runScoreRefresh } from './score-refresh.job';

let payoutTask: cron.ScheduledTask | null = null;
let scoreRefreshTask: cron.ScheduledTask | null = null;

export function startScheduler(): void {
  // Daily payout at 23:58 UTC
  payoutTask = cron.schedule(
    '58 23 * * *',
    async () => {
      try {
        await runDailyPayout();
      } catch (err: any) {
        console.error('[Scheduler] Daily payout job failed:', err.message);
      }
    },
    {
      timezone: 'UTC',
    }
  );

  // Score refresh every 10 minutes
  scoreRefreshTask = cron.schedule(
    '*/10 * * * *',
    async () => {
      try {
        await runScoreRefresh();
      } catch (err: any) {
        console.error('[Scheduler] Score refresh job failed:', err.message);
      }
    },
    {
      timezone: 'UTC',
    }
  );

  console.log('[Scheduler] Jobs scheduled:');
  console.log('  - Daily payout: 23:58 UTC');
  console.log('  - Score refresh: every 10 minutes');
}

export function stopScheduler(): void {
  payoutTask?.stop();
  scoreRefreshTask?.stop();
  payoutTask = null;
  scoreRefreshTask = null;
  console.log('[Scheduler] All jobs stopped');
}
