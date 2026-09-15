import { execSync } from 'node:child_process';

/**
 * Provision the SQLite database the API tests run against.
 *
 * Deliberately a plain, non-destructive `db push`: it creates the file and
 * syncs the schema without resetting anything. Test isolation comes from the
 * per-test truncation in `beforeEach`, so there is no reason to reach for a
 * destructive flag here - and every reason not to, given the same command
 * could one day be pointed at a real database by accident.
 */
export default function setup() {
  // execSync rather than execFileSync: on Windows, npx resolves to npx.cmd,
  // which spawnSync refuses to launch directly (EINVAL) without a shell.
  execSync('npx prisma db push --skip-generate', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: 'file:./test.db' },
  });
}
