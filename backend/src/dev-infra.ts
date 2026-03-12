/**
 * dev-infra.ts
 * Starts embedded Postgres and Redis for local development.
 * Only used when NODE_ENV=development and no external DB/Redis is reachable.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
// Dynamic requires bypass moduleResolution issues with embedded packages
const EmbeddedPostgres = require('embedded-postgres').default;
const { RedisMemoryServer } = require('redis-memory-server');

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(__dirname, '..', '.dev-data');

export async function startDevInfra(): Promise<{ pgUrl: string; redisUrl: string }> {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  console.log('🗄️  Starting embedded Postgres...');
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(DATA_DIR, 'postgres'),
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
  });

  // Remove stale lock file and clean shared memory (left by a crashed previous run)
  const lockFile = path.join(DATA_DIR, 'postgres', 'postmaster.pid');
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
    console.log('🧹 Removed stale Postgres lock file');
    // Also clean stale shared memory segments
    try {
      execSync("ipcs -m | awk 'NR>3 && $6==\"0\" {print $2}' | xargs -I{} ipcrm -m {} 2>/dev/null || true", { stdio: 'ignore' });
    } catch { /* ignore */ }
  }

  const pgDataExists = fs.existsSync(path.join(DATA_DIR, 'postgres', 'PG_VERSION'));
  if (!pgDataExists) {
    await pg.initialise();
    await pg.createDatabase('vaultdrop');
  }
  await pg.start();

  console.log('✅ Postgres running on port 5432');

  console.log('🔴 Starting embedded Redis...');
  const redis = new RedisMemoryServer({
    instance: { port: 6379 },
  });

  const redisHost = await redis.getHost();
  const redisPort = await redis.getPort();
  console.log(`✅ Redis running on ${redisHost}:${redisPort}`);

  const pgUrl = 'postgresql://postgres:password@localhost:5432/vaultdrop';
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  process.env.DATABASE_URL = pgUrl;
  process.env.REDIS_URL = redisUrl;

  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping dev infrastructure...');
    await pg.stop();
    await redis.stop();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await pg.stop();
    await redis.stop();
    process.exit(0);
  });

  return { pgUrl, redisUrl };
}
