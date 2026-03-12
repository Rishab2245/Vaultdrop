import { GraphQLContext } from '../context';
import { paymentService } from '../../services/payment.service';

export const paymentResolvers = {
  Query: {
    myPayouts: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
      if (!ctx.session) throw new Error('Authentication required');

      const payouts = await paymentService.getPayouts(ctx.session.id);
      return payouts.map((p) => ({
        ...p,
        amount: Number(p.amount),
        createdAt: p.createdAt.toISOString(),
        settledAt: p.settledAt?.toISOString() ?? null,
      }));
    },
  },

  Mutation: {
    initiatePeek: async (
      _parent: unknown,
      args: { secretId: string; type: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.session) throw new Error('Authentication required');

      const peekType = args.type.toUpperCase() as 'PEEK' | 'UNLOCK';
      if (!['PEEK', 'UNLOCK'].includes(peekType)) {
        throw new Error('Invalid peek type. Must be PEEK or UNLOCK');
      }

      return paymentService.createPeekPaymentIntent(args.secretId, ctx.session.id, peekType);
    },

    confirmPeek: async (
      _parent: unknown,
      args: { secretId: string; txId: string; type: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.session) throw new Error('Authentication required');

      const peekType = args.type.toUpperCase() as 'PEEK' | 'UNLOCK';
      if (!['PEEK', 'UNLOCK'].includes(peekType)) {
        throw new Error('Invalid peek type');
      }

      await paymentService.confirmPeek(args.secretId, ctx.session.id, args.txId, peekType);

      const { secretService } = await import('../../services/secret.service');
      const secret = await secretService.getSecretById(args.secretId, ctx.session.id);
      if (!secret) throw new Error('Secret not found');

      return {
        ...secret,
        peekPrice: secret.peekPrice ? Number(secret.peekPrice) : null,
        unlockPrice: secret.unlockPrice ? Number(secret.unlockPrice) : null,
        entryFeePaid: Number(secret.entryFeePaid),
        poolDate: secret.poolDate
          ? new Date(secret.poolDate).toISOString().split('T')[0]
          : null,
        createdAt: new Date(secret.createdAt).toISOString(),
      };
    },

    requestPayout: async (
      _parent: unknown,
      args: { amount: number; method: string; destination: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.session) throw new Error('Authentication required');

      const payout = await paymentService.requestPayout(
        ctx.session.id,
        args.amount,
        args.method,
        args.destination
      );

      return {
        ...payout,
        amount: Number(payout.amount),
        createdAt: payout.createdAt.toISOString(),
        settledAt: payout.settledAt?.toISOString() ?? null,
      };
    },
  },
};
