import { GraphQLContext } from '../context';
import { secretService } from '../../services/secret.service';
import { SecretCategory } from '@prisma/client';

function mapSecret(secret: any, sessionId?: string | null) {
  return {
    ...secret,
    codename: secret.session?.codename ?? null,
    peekPrice: secret.peekPrice ? Number(secret.peekPrice) : null,
    unlockPrice: secret.unlockPrice ? Number(secret.unlockPrice) : null,
    entryFeePaid: Number(secret.entryFeePaid),
    poolDate: secret.poolDate ? new Date(secret.poolDate).toISOString().split('T')[0] : null,
    createdAt: new Date(secret.createdAt).toISOString(),
    hasVoted: secret.hasVoted ?? false,
    hasPeeked: secret.hasPeeked ?? false,
    hasUnlocked: secret.hasUnlocked ?? false,
    bowl: secret.bowl
      ? {
          ...secret.bowl,
          entryFee: secret.bowl.entryFee ? Number(secret.bowl.entryFee) : null,
          createdAt: new Date(secret.bowl.createdAt).toISOString(),
          isMember: false,
        }
      : null,
  };
}

export const secretResolvers = {
  Query: {
    feed: async (
      _parent: unknown,
      args: {
        date?: string;
        category?: SecretCategory;
        sort?: string;
        cursor?: string;
        limit?: number;
        ghostOnly?: boolean;
        bowlSlug?: string;
      },
      ctx: GraphQLContext
    ) => {
      const result = await secretService.getFeed({
        ...args,
        sessionId: ctx.session?.id,
      });

      return {
        items: result.items.map((s) => mapSecret(s, ctx.session?.id)),
        nextCursor: result.nextCursor,
        total: result.total,
      };
    },

    secret: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      const secret = await secretService.getSecretById(args.id, ctx.session?.id);
      if (!secret) return null;
      return mapSecret(secret, ctx.session?.id);
    },

    mySecrets: async (
      _parent: unknown,
      args: { cursor?: string; limit?: number },
      ctx: GraphQLContext
    ) => {
      if (!ctx.session) throw new Error('Authentication required');

      const result = await secretService.getMySecrets(ctx.session.id, args.cursor, args.limit);
      return {
        items: result.items.map((s) => mapSecret(s, ctx.session?.id)),
        nextCursor: result.nextCursor,
        total: result.total,
      };
    },

    leaderboard: async (
      _parent: unknown,
      args: { date?: string; limit?: number },
      ctx: GraphQLContext
    ) => {
      const { leaderboardService } = await import('../../services/leaderboard.service');
      const secrets = await leaderboardService.getLeaderboard(args.date, args.limit ?? 10);
      return secrets.map((s: any, i: number) => ({
        rank: i + 1,
        score: Number(s.rankScore),
        secret: mapSecret(s, ctx.session?.id),
      }));
    },

    hallOfFame: async (
      _parent: unknown,
      args: { cursor?: string; limit?: number },
      _ctx: GraphQLContext
    ) => {
      const { leaderboardService } = await import('../../services/leaderboard.service');
      const result = await leaderboardService.getHallOfFame(args.cursor, args.limit);
      return {
        items: result.items.map((e) => ({
          ...e,
          prizeAmount: Number(e.prizeAmount),
          winDate: new Date(e.winDate).toISOString().split('T')[0],
        })),
        nextCursor: result.nextCursor,
      };
    },
  },

  Mutation: {
    submitSecret: async (
      _parent: unknown,
      args: {
        input: {
          category: SecretCategory;
          content: string;
          hintText?: string;
          isGhost: boolean;
          peekPrice?: number;
          unlockPrice?: number;
          bowlId?: string;
          bowlSlug?: string;
          paymentIntentId: string;
          mediaUrl?: string;
          mediaType?: string;
          linkUrl?: string;
          linkTitle?: string;
          linkDomain?: string;
        };
      },
      ctx: GraphQLContext
    ) => {
      if (!ctx.session) throw new Error('Authentication required');

      // Resolve bowlSlug → bowlId if needed
      let resolvedBowlId = args.input.bowlId;
      if (!resolvedBowlId && args.input.bowlSlug) {
        const { bowlService } = await import('../../services/bowl.service');
        const bowl = await bowlService.getBowlBySlug(args.input.bowlSlug);
        resolvedBowlId = bowl?.id;
      }

      const secret = await secretService.submitSecret({
        ...args.input,
        bowlId: resolvedBowlId,
        sessionId: ctx.session.id,
        entryFeePaid: 1.99,
      });

      // Increment bowl secret count if applicable
      if (resolvedBowlId) {
        const { bowlService } = await import('../../services/bowl.service');
        await bowlService.incrementSecretCount(resolvedBowlId);
      }

      return mapSecret({ ...secret, hasVoted: false, hasPeeked: false, hasUnlocked: false });
    },

    reportSecret: async (
      _parent: unknown,
      args: { id: string; reason: string },
      _ctx: GraphQLContext
    ) => {
      await secretService.reportSecret(args.id, args.reason);
      return true;
    },

    shareSecret: async (
      _parent: unknown,
      args: { id: string },
      _ctx: GraphQLContext
    ) => {
      await secretService.incrementShareCount(args.id);
      return true;
    },
  },
};
