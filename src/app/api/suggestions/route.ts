import { prisma } from '@/lib/db';
import { asString, fail, guard, ok, readJson } from '@/lib/api';
import { RATE_LIMITS } from '@/lib/ratelimit';
import { SUGGESTION_MAX, isSuggestionKind } from '@/lib/constants';
import { screenWallBody } from '@/lib/moderation';
import { resolveGhost } from '@/lib/ghost-server';

export const dynamic = 'force-dynamic';

/**
 * Leave a suggestion.
 *
 * No ghost required and no contact field. A suggestion box that collects an
 * email address is a mailing list with extra steps, and this site does not
 * collect email addresses. A ghost that happens to be signed in attaches its
 * codename so a reply could be posted publicly, and nothing more.
 */
export async function POST(request: Request) {
  const limited = guard(request, 'suggestions', RATE_LIMITS.report);
  if (limited) return limited;

  const payload = await readJson(request);
  if (!payload) return fail(400, 'Malformed request.');

  const raw = asString(payload.body, SUGGESTION_MAX);
  if (!raw || raw.length < 8) {
    return fail(400, `Tell us a little more - between 8 and ${SUGGESTION_MAX} characters.`);
  }

  const kind = isSuggestionKind(payload.kind) ? String(payload.kind) : 'idea';

  // Screened like everything else. People paste contact details into feedback
  // forms constantly, and this one is read by a human later.
  const verdict = screenWallBody(raw);
  if (verdict.action === 'block') return fail(422, verdict.reason);

  const ghost = await resolveGhost(request);

  await prisma.suggestion.create({
    data: { body: verdict.body, kind, codename: ghost?.codename ?? null },
  });

  return ok({ received: true, redactions: verdict.redactions }, { status: 201 });
}
