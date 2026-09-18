import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

/**
 * Work out which database the tests get, once, here in the main process.
 *
 * globalSetup runs before the worker `env` below is applied, so the value has
 * to be on `process.env` by the time this config finishes evaluating - which is
 * also why the derivation lives here rather than being duplicated in both
 * places and left to drift.
 */
function resolveTestDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  // vitest does not read .env; Prisma does. Parse it rather than add a dep.
  let url = process.env.DATABASE_URL ?? '';
  if (!url) {
    try {
      const env = readFileSync(new URL('./.env', import.meta.url), 'utf8');
      url = env.match(/^DATABASE_URL\s*=\s*"?([^"\n]+)"?/m)?.[1] ?? '';
    } catch {
      /* no .env; fall through to the SQLite default below */
    }
  }

  if (!url) return 'file:./test.db';

  // Send the suite to a sibling database, never the one the app serves from.
  // The "_test" guard in tests/global-setup.ts enforces this regardless.
  return url.replace(/\/vaultdrop(\?|$)/, '/vaultdrop_test$1');
}

const TEST_DATABASE_URL = resolveTestDatabaseUrl();
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    globalSetup: ['./tests/global-setup.ts'],
    // Route handlers share one database, so let them run in a single worker
    // rather than racing each other's truncation.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: 'test',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
