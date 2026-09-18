import { execSync } from 'node:child_process';

/**
 * Provision the database the API tests run against.
 *
 * The suite truncates every collection in `beforeEach`, so pointing it at the
 * wrong database would destroy real records with no warning and no undo. The
 * guard below is the only thing standing between a mistyped environment
 * variable and exactly that, which is why it refuses rather than warns.
 *
 * The rule: the database name must end in `_test`. Nothing else runs.
 */
export default function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set for the test run.');

  const name = databaseNameOf(url);

  if (!name) {
    throw new Error(
      `Refusing to run: could not determine a database name from DATABASE_URL.\n` +
        `The test suite deletes every record it finds, so it only runs against a ` +
        `database whose name ends in "_test".`
    );
  }

  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run against database "${name}".\n\n` +
        `This suite truncates every collection before each test. It will only run ` +
        `against a database whose name ends in "_test" - point DATABASE_URL at ` +
        `something like ".../vaultdrop_test" and try again.`
    );
  }

  // A plain, non-destructive push: it syncs indexes without resetting anything.
  // Isolation comes from the per-test truncation, so there is no reason to
  // reach for a destructive flag here, and every reason not to.
  execSync('node scripts/sync-db-provider.mjs && npx prisma db push --skip-generate', {
    stdio: 'ignore',
    env: process.env,
  });
}

/** The database name from a connection string, for both Mongo and file URLs. */
function databaseNameOf(url: string): string | null {
  if (url.startsWith('file:')) {
    const file = url.slice(5).split('?')[0];
    return file.replace(/^.*[\\/]/, '').replace(/\.db$/, '');
  }

  try {
    // mongodb+srv:// is not a scheme URL() parses cleanly for pathname, so
    // normalise it to something it does before reading the path.
    const normalised = url.replace(/^mongodb\+srv:\/\//, 'mongodb://');
    const path = new URL(normalised).pathname.replace(/^\//, '');
    return path.split('?')[0] || null;
  } catch {
    return null;
  }
}
