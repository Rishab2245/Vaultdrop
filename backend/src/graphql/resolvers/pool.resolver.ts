import { GraphQLContext } from '../context';
import { poolService } from '../../services/pool.service';

export const poolResolvers = {
  Query: {
    currentPool: async (_parent: unknown, _args: unknown, _ctx: GraphQLContext) => {
      return poolService.getCurrentPool();
    },

    dailyPool: async (_parent: unknown, _args: unknown, _ctx: GraphQLContext) => {
      return poolService.getCurrentPool();
    },

    poolHistory: async (
      _parent: unknown,
      args: { limit?: number },
      _ctx: GraphQLContext
    ) => {
      const pools = await poolService.getPoolHistory(args.limit ?? 10);
      return pools.map((p) => ({
        ...p,
        totalAmount: Number(p.totalAmount),
        winnerPayout: p.winnerPayout ? Number(p.winnerPayout) : null,
        poolDate: p.poolDate.toISOString().split('T')[0],
        settledAt: p.settledAt?.toISOString() ?? null,
        entryCount: 0,
        timeUntilDrawMs: 0,
      }));
    },
  },
};
