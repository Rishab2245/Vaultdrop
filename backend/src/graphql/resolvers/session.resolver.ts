import { GraphQLContext } from '../context';
import { sessionService } from '../../services/session.service';

export const sessionResolvers = {
  Query: {
    me: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      if (!ctx.session) return null;
      const session = await sessionService.getSessionById(ctx.session.id);
      if (!session) return null;
      return {
        ...session,
        earnings: Number(session.earnings),
        createdAt: new Date(session.createdAt).toISOString(),
      };
    },
  },

  Mutation: {
    createSession: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      const ipRegion = (ctx.req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        ?? ctx.req.socket.remoteAddress;

      const { session, token } = await sessionService.createSession(ipRegion);

      // Set cookie
      ctx.res.cookie('vaultdrop_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days
        path: '/',
      });

      return {
        ...session,
        earnings: Number(session.earnings),
        createdAt: new Date(session.createdAt).toISOString(),
      };
    },
  },
};
