import { sessionResolvers } from './session.resolver';
import { secretResolvers } from './secret.resolver';
import { voteResolvers } from './vote.resolver';
import { poolResolvers } from './pool.resolver';
import { bowlResolvers } from './bowl.resolver';
import { paymentResolvers } from './payment.resolver';

function mergeResolvers(...resolverObjects: any[]): any {
  const merged: any = { Query: {}, Mutation: {} };

  for (const resolvers of resolverObjects) {
    if (resolvers.Query) {
      Object.assign(merged.Query, resolvers.Query);
    }
    if (resolvers.Mutation) {
      Object.assign(merged.Mutation, resolvers.Mutation);
    }
  }

  return merged;
}

export const resolvers = mergeResolvers(
  sessionResolvers,
  secretResolvers,
  voteResolvers,
  poolResolvers,
  bowlResolvers,
  paymentResolvers
);
