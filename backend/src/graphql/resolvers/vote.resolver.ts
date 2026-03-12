import { GraphQLContext } from '../context';
import { voteService } from '../../services/vote.service';
import prisma from '../../config/prisma';

export const voteResolvers = {
  Mutation: {
    voteSecret: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      if (!ctx.session) throw new Error('Authentication required');
      return voteService.vote(args.id, ctx.session.id);
    },

    removeVote: async (_parent: unknown, args: { id: string }, ctx: GraphQLContext) => {
      if (!ctx.session) throw new Error('Authentication required');
      return voteService.removeVote(args.id, ctx.session.id);
    },

    addReaction: async (
      _parent: unknown,
      args: { secretId: string; emoji: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.session) throw new Error('Authentication required');
      return voteService.addReaction(args.secretId, ctx.session.id, args.emoji);
    },

    addComment: async (
      _parent: unknown,
      args: { secretId: string; content: string; parentId?: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.session) throw new Error('Authentication required');

      const content = args.content.trim();
      if (!content || content.length > 500) {
        throw new Error('Comment must be between 1 and 500 characters');
      }

      const [comment] = await prisma.$transaction([
        prisma.comment.create({
          data: {
            secretId: args.secretId,
            sessionId: ctx.session.id,
            content,
            ...(args.parentId ? { parentId: args.parentId } : {}),
          },
          include: {
            session: true,
            replies: { include: { session: { select: { codename: true } } }, orderBy: { createdAt: 'asc' } },
          },
        }),
        prisma.secret.update({
          where: { id: args.secretId },
          data: { commentCount: { increment: 1 } },
        }),
      ]);

      const c = comment as any;
      return {
        id: c.id,
        content: c.content,
        codename: c.session.codename,
        createdAt: c.createdAt.toISOString(),
        parentId: c.parentId ?? null,
        replies: (c.replies ?? []).map((r: any) => ({
          id: r.id,
          content: r.content,
          codename: r.session.codename,
          createdAt: r.createdAt.toISOString(),
          parentId: r.parentId ?? null,
          replies: [],
        })),
      };
    },
  },

  Query: {
    comments: async (
      _parent: unknown,
      args: { secretId: string; cursor?: string; limit?: number },
      _ctx: GraphQLContext
    ) => {
      const take = Math.min(args.limit ?? 20, 50);

      const comments = await prisma.comment.findMany({
        where: { secretId: args.secretId, parentId: null },
        orderBy: { createdAt: 'desc' },
        take,
        include: {
          session: { select: { codename: true } },
          replies: {
            include: { session: { select: { codename: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
        ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
      });

      return comments.map((c) => ({
        id: c.id,
        content: c.content,
        codename: (c as any).session.codename,
        createdAt: c.createdAt.toISOString(),
        parentId: (c as any).parentId ?? null,
        replies: ((c as any).replies ?? []).map((r: any) => ({
          id: r.id,
          content: r.content,
          codename: r.session.codename,
          createdAt: r.createdAt.toISOString(),
          parentId: r.parentId ?? null,
          replies: [],
        })),
      }));
    },
  },
};

