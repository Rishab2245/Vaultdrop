/**
 * start-infra.js
 * Starts embedded Postgres and Redis as standalone long-running processes.
 * Run this ONCE before starting nodemon. Keep it running in a separate terminal.
 *
 * Usage: node start-infra.js
 */

const EmbeddedPostgres = require('embedded-postgres').default;
const { RedisMemoryServer } = require('redis-memory-server');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '.dev-data');
fs.mkdirSync(DATA_DIR, { recursive: true });

async function main() {
  console.log('🗄️  Starting embedded Postgres...');

  // Clean stale lock file
  const lockFile = path.join(DATA_DIR, 'postgres', 'postmaster.pid');
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
    console.log('🧹 Removed stale lock file');
  }

  const pg = new EmbeddedPostgres({
    databaseDir: path.join(DATA_DIR, 'postgres'),
    user: 'postgres',
    password: 'password',
    port: 5432,
    persistent: true,
  });

  const pgDataExists = fs.existsSync(path.join(DATA_DIR, 'postgres', 'PG_VERSION'));
  if (!pgDataExists) {
    await pg.initialise();
    await pg.createDatabase('vaultdrop');
    console.log('✅ Postgres initialized');
  }

  await pg.start();
  console.log('✅ Postgres running on port 5432');

  console.log('🔴 Starting embedded Redis...');
  const redis = new RedisMemoryServer({ instance: { port: 6379 } });
  await redis.getHost();
  await redis.getPort();
  console.log('✅ Redis running on port 6379');

  console.log('\n🟢 Infrastructure ready!');
  console.log('   DATABASE_URL=postgresql://postgres:password@localhost:5432/vaultdrop');
  console.log('   REDIS_URL=redis://127.0.0.1:6379');
  console.log('\n   Now run: npm run dev  (in a separate terminal)');
  console.log('   Press Ctrl+C to stop infrastructure.\n');

  const shutdown = async () => {
    console.log('\n🛑 Stopping infrastructure...');
    try { await pg.stop(); } catch {}
    try { await redis.stop(); } catch {}
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  setInterval(() => {}, 60000);
}

main().catch((err) => {
  console.error('❌ Infrastructure failed to start:', err.message || err);
  process.exit(1);
});
