/**
 * Point the Prisma datasource at whatever DATABASE_URL actually is.
 *
 * SQLite is right for local work: `npm install && npm run dev` and the app runs
 * with no database to provision. It is wrong for Vercel, where the filesystem
 * is ephemeral and read-only, so a SQLite file would be empty on every cold
 * start and silently lose every record.
 *
 * Keeping two schema files would mean two places to change every model and one
 * of them going stale. Instead there is one schema, and this rewrites its
 * provider line from the connection string it is actually being given. It runs
 * before `prisma generate` in the build, and is idempotent - running it twice,
 * or on an already-correct schema, changes nothing.
 *
 * This only works because the schema is deliberately portable: enums are
 * modelled as validated strings (SQLite has no enums) and no column uses a
 * provider-specific native type.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = join(root, 'prisma', 'schema.prisma');

/**
 * Resolve the connection string the way Prisma will.
 *
 * Prisma loads `.env` itself; Node does not. Reading only `process.env` here
 * meant a local build saw no URL, rewrote the provider to SQLite, and then
 * handed Prisma a Mongo URL it refused - so this has to look in the same two
 * places, in the same order. A real environment variable still wins, which is
 * what makes hosted builds work.
 */
function resolveUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envPath = join(root, '.env');
  if (!existsSync(envPath)) return '';

  const match = readFileSync(envPath, 'utf8').match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  return match?.[1] ?? '';
}

const url = resolveUrl();
const provider = /^mongodb(\+srv)?:\/\//i.test(url)
  ? 'mongodb'
  : /^postgres(ql)?:\/\//i.test(url)
    ? 'postgresql'
    : /^mysql:\/\//i.test(url)
      ? 'mysql'
      : 'sqlite';

const schema = readFileSync(schemaPath, 'utf8');
const updated = schema.replace(
  /(datasource db \{[^}]*?provider\s*=\s*)"[^"]+"/s,
  `$1"${provider}"`
);

if (updated !== schema) {
  writeFileSync(schemaPath, updated);
  console.log(`[db] datasource provider -> ${provider}`);
} else {
  console.log(`[db] datasource provider already ${provider}`);
}
