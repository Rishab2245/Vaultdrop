export function calculateRankScore(secret: {
  voteCount: number;
  aiExplosiveScore: number | null;
  commentCount: number;
  peekCount: number;
  unlockCount: number;
  reactionCount: number;
  shareCount: number;
  reportCount: number;
  peekPrice: any;
}): number {
  const votes = secret.voteCount * 0.35;
  const aiScore = ((secret.aiExplosiveScore ?? 50) / 100) * 25 * 0.25;
  const engagement =
    Math.min((secret.commentCount + secret.peekCount + secret.unlockCount) / 10, 10) * 0.15;
  const reactions = Math.min(secret.reactionCount / 5, 10) * 0.1;
  const shares = Math.min(secret.shareCount / 3, 10) * 0.1;
  const peekConversion =
    secret.peekCount > 0 && secret.peekPrice
      ? Math.min(secret.unlockCount / secret.peekCount, 1) * 10 * 0.05
      : 0;
  const reportPenalty = Math.min(secret.reportCount * 2, 20) * 0.15;

  return Math.max(
    0,
    votes + aiScore + engagement + reactions + shares + peekConversion - reportPenalty
  );
}
