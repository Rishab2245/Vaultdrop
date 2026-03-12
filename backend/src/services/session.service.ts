import { AnonSession } from '@prisma/client';
import prisma from '../config/prisma';
import { getRedis, REDIS_KEYS } from '../config/redis';
import { generateCodename } from '../utils/codename';
import { generateToken, hashToken, signSessionToken } from '../utils/crypto';

const SESSION_CACHE_TTL = 300; // 5 minutes

export class SessionService {
  async createSession(ipRegion?: string): Promise<{ session: AnonSession; token: string }> {
    const token = generateToken();
    const tokenHash = hashToken(token);

    let codename: string;
    let attempts = 0;
    do {
      codename = generateCodename();
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique codename');
      }
    } while (await prisma.anonSession.findUnique({ where: { codename } }));

    const session = await prisma.anonSession.create({
      data: {
        codename,
        tokenHash,
        ipRegion,
      },
    });

    const jwt = signSessionToken({ sessionId: session.id, codename: session.codename });

    // Cache the session
    const redis = getRedis();
    await redis.setex(
      REDIS_KEYS.session(session.id),
      SESSION_CACHE_TTL,
      JSON.stringify(session)
    );
    await redis.setex(
      REDIS_KEYS.sessionByToken(tokenHash),
      SESSION_CACHE_TTL,
      session.id
    );

    return { session, token: jwt };
  }

  async getSessionById(id: string): Promise<AnonSession | null> {
    const redis = getRedis();
    const cached = await redis.get(REDIS_KEYS.session(id));
    if (cached) {
      return JSON.parse(cached) as AnonSession;
    }

    const session = await prisma.anonSession.findUnique({ where: { id } });
    if (session) {
      await redis.setex(REDIS_KEYS.session(id), SESSION_CACHE_TTL, JSON.stringify(session));
    }
    return session;
  }

  async getSessionByTokenHash(tokenHash: string): Promise<AnonSession | null> {
    const redis = getRedis();
    const cachedId = await redis.get(REDIS_KEYS.sessionByToken(tokenHash));
    if (cachedId) {
      return this.getSessionById(cachedId);
    }

    const session = await prisma.anonSession.findUnique({ where: { tokenHash } });
    if (session) {
      await redis.setex(
        REDIS_KEYS.sessionByToken(tokenHash),
        SESSION_CACHE_TTL,
        session.id
      );
      await redis.setex(REDIS_KEYS.session(session.id), SESSION_CACHE_TTL, JSON.stringify(session));
    }
    return session;
  }

  async updateLastSeen(sessionId: string): Promise<void> {
    await prisma.anonSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
    // Invalidate cache so next read is fresh
    const redis = getRedis();
    await redis.del(REDIS_KEYS.session(sessionId));
  }

  async addEarnings(sessionId: string, amount: number): Promise<void> {
    await prisma.anonSession.update({
      where: { id: sessionId },
      data: {
        earnings: { increment: amount },
      },
    });
    const redis = getRedis();
    await redis.del(REDIS_KEYS.session(sessionId));
  }

  async invalidateCache(sessionId: string): Promise<void> {
    const redis = getRedis();
    await redis.del(REDIS_KEYS.session(sessionId));
  }
}

export const sessionService = new SessionService();
