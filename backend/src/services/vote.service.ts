import prisma from '../config/prisma';
import { getRedis, REDIS_KEYS } from '../config/redis';
import { secretService } from './secret.service';

export interface VotePayload {
  secretId: string;
  voteCount: number;
  rankScore: number;
  hasVoted: boolean;
}

export class VoteService {
  async vote(secretId: string, sessionId: string): Promise<VotePayload> {
    const existing = await prisma.vote.findUnique({
      where: { secretId_sessionId: { secretId, sessionId } },
    });

    if (existing) {
      throw new Error('Already voted on this secret');
    }

    await prisma.$transaction([
      prisma.vote.create({ data: { secretId, sessionId } }),
      prisma.secret.update({
        where: { id: secretId },
        data: { voteCount: { increment: 1 } },
      }),
    ]);

    const rankScore = await secretService.refreshRankScore(secretId);
    const secret = await prisma.secret.findUnique({ where: { id: secretId } });

    const payload: VotePayload = {
      secretId,
      voteCount: secret?.voteCount ?? 0,
      rankScore,
      hasVoted: true,
    };

    // Publish SSE event
    const redis = getRedis();
    await redis.publish(
      REDIS_KEYS.sseChannel,
      JSON.stringify({
        type: 'vote:update',
        data: payload,
      })
    );

    return payload;
  }

  async removeVote(secretId: string, sessionId: string): Promise<VotePayload> {
    const existing = await prisma.vote.findUnique({
      where: { secretId_sessionId: { secretId, sessionId } },
    });

    if (!existing) {
      throw new Error('Vote not found');
    }

    await prisma.$transaction([
      prisma.vote.delete({
        where: { secretId_sessionId: { secretId, sessionId } },
      }),
      prisma.secret.update({
        where: { id: secretId },
        data: { voteCount: { decrement: 1 } },
      }),
    ]);

    const rankScore = await secretService.refreshRankScore(secretId);
    const secret = await prisma.secret.findUnique({ where: { id: secretId } });

    const payload: VotePayload = {
      secretId,
      voteCount: Math.max(0, secret?.voteCount ?? 0),
      rankScore,
      hasVoted: false,
    };

    const redis = getRedis();
    await redis.publish(
      REDIS_KEYS.sseChannel,
      JSON.stringify({
        type: 'vote:update',
        data: payload,
      })
    );

    return payload;
  }

  async addReaction(secretId: string, sessionId: string, emoji: string): Promise<boolean> {
    const validEmojis = ['🔥', '😱', '🤯', '💀', '👀', '🫣', '💣', '⚡', '🕵️', '🤫'];
    if (!validEmojis.includes(emoji) && emoji.length > 4) {
      throw new Error('Invalid emoji');
    }

    try {
      await prisma.$transaction([
        prisma.reaction.create({
          data: { secretId, sessionId, emoji },
        }),
        prisma.secret.update({
          where: { id: secretId },
          data: { reactionCount: { increment: 1 } },
        }),
      ]);
    } catch (err: any) {
      // Unique constraint violation - already reacted with this emoji
      if (err.code === 'P2002') {
        return false;
      }
      throw err;
    }

    await secretService.refreshRankScore(secretId);
    await secretService.invalidateCache(secretId);

    return true;
  }
}

export const voteService = new VoteService();
