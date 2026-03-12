import { GraphQLContext } from '../context';
import { bowlService } from '../../services/bowl.service';

function mapBowl(bowl: any, isMember = false) {
  return {
    ...bowl,
    entryFee: bowl.entryFee ? Number(bowl.entryFee) : null,
    createdAt: new Date(bowl.createdAt).toISOString(),
    isMember: bowl.isMember ?? isMember,
  };
}

export const bowlResolvers = {
  Query: {
    bowls: async (
      _parent: unknown,
      args: { cursor?: string; limit?: number; isPrivate?: boolean },
      ctx: GraphQLContext
    ) => {
      const result = await bowlService.getBowls({
        cursor: args.cursor,
        limit: args.limit,
        isPrivate: args.isPrivate,
        sessionId: ctx.session?.id,
      });

      return {
        items: result.items.map((b: any) => mapBowl(b)),
        nextCursor: result.nextCursor,
      };
    },

    bowl: async (_parent: unknown, args: { slug: string }, ctx: GraphQLContext) => {
      const bowl = await bowlService.getBowlBySlug(args.slug, ctx.session?.id);
      if (!bowl) return null;
      return mapBowl(bowl);
    },
  },

  Mutation: {
    createBowl: async (
      _parent: unknown,
      args: {
        input: {
          name: string;
          description?: string;
          coverEmoji?: string;
          isPrivate?: boolean;
          entryFee?: number;
        };
      },
      ctx: GraphQLContext
    ) => {
      if (!ctx.session) throw new Error('Authentication required');

      const bowl = await bowlService.createBowl({
        ...args.input,
        creatorSessionId: ctx.session.id,
      });

      return mapBowl({ ...bowl, isMember: true });
    },

    joinBowl: async (
      _parent: unknown,
      args: { bowlId: string; txId?: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.session) throw new Error('Authentication required');

      const membership = await bowlService.joinBowl(args.bowlId, ctx.session.id, args.txId);
      return {
        bowlId: membership.bowlId,
        joinedAt: membership.joinedAt.toISOString(),
      };
    },
  },
};
