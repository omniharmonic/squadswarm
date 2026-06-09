/**
 * Apply Drizzle migrations against a standard PostgreSQL instance using
 * node-postgres. Use this for local development and CI (the production Neon
 * HTTP driver can't talk to a local socket):
 *
 *   DATABASE_URL=postgres://... pnpm --filter @squadswarm/db migrate:pg
 */
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);

  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = join(here, '..', 'migrations');

  console.warn(`[migrate] applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.warn('[migrate] done');
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
