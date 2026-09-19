import { fail, ok, guard } from '@/lib/api';
import { settleStaleEscrow, sweepExpired } from '@/lib/sweep';
import { RATE_LIMITS } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

/**
 * Scheduled cleanup of expired drops.
 *
 * Point a cron at this (Vercel Cron, GitHub Actions, systemd timer - anything
 * that can make an HTTP request) so expiry is guaranteed even on a site with
 * no traffic. Set CRON_SECRET and send it as a bearer token.
 *
 * With no CRON_SECRET configured the endpoint refuses to run rather than
 * defaulting to open: an unauthenticated delete endpoint is worth more to an
 * attacker than to an operator.
 */
export async function POST(request: Request) {
  // Guarded as well as authenticated: without a limit, the shared secret can
  // be attacked at whatever rate the network allows.
  const limited = guard(request, 'maintenance:sweep', RATE_LIMITS.report);
  if (limited) return limited;

  const secret = process.env.CRON_SECRET;
  if (!secret) return fail(503, 'Sweeping is not configured. Set CRON_SECRET.');

  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (provided !== secret) return fail(401, 'Unauthorised.');

  const [deleted, settled] = await Promise.all([sweepExpired(), settleStaleEscrow()]);
  return ok({ deleted, settled });
}
