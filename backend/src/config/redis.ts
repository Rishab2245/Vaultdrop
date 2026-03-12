import Redis from 'ioredis';
import { env } from './env';

let redisInstance: Redis | null = null;
let subscriberInstance: Redis | null = null;
let publisherInstance: Redis | null = null;

function createRedisClient(name: string): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  client.on('connect', () => {
    console.log(`[Redis:${name}] Connected`);
  });

  client.on('error', (err) => {
    console.error(`[Redis:${name}] Error:`, err.message);
  });

  client.on('reconnecting', () => {
    console.log(`[Redis:${name}] Reconnecting...`);
  });

  return client;
}

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = createRedisClient('main');
  }
  return redisInstance;
}

export function getSubscriber(): Redis {
  if (!subscriberInstance) {
    subscriberInstance = createRedisClient('subscriber');
  }
  return subscriberInstance;
}

export function getPublisher(): Redis {
  if (!publisherInstance) {
    publisherInstance = createRedisClient('publisher');
  }
  return publisherInstance;
}

export async function closeRedisConnections(): Promise<void> {
  const clients = [redisInstance, subscriberInstance, publisherInstance].filter(Boolean) as Redis[];
  await Promise.all(clients.map((c) => c.quit()));
  redisInstance = null;
  subscriberInstance = null;
  publisherInstance = null;
}

// Redis key namespaces
export const REDIS_KEYS = {
  session: (id: string) => `session:${id}`,
  sessionByToken: (hash: string) => `session:token:${hash}`,
  leaderboard: (date: string) => `leaderboard:${date}`,
  poolTotal: (date: string) => `pool:total:${date}`,
  poolEntryCount: (date: string) => `pool:entries:${date}`,
  voteSet: (secretId: string) => `votes:${secretId}`,
  secretCache: (id: string) => `secret:${id}`,
  feedCache: (date: string, category: string, sort: string) =>
    `feed:${date}:${category}:${sort}`,
  sseChannel: 'sse:events',
  poolUpdateChannel: 'pool:updates',
} as const;
