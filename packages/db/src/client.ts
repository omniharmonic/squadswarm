import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Production uses Neon's HTTP driver (serverless-friendly). For local
 * development and integration tests against a plain PostgreSQL instance, set
 * `DATABASE_DRIVER=pg` to use node-postgres instead — the Neon HTTP driver
 * cannot connect to a local socket/TCP Postgres.
 */
function createDb() {
  if (process.env.DATABASE_DRIVER === 'pg') {
    // Imported lazily so the `pg` package is only required when explicitly opted
    // into, keeping it out of the serverless production bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require('pg');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzlePg } = require('drizzle-orm/node-postgres');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    return drizzlePg(pool, { schema }) as unknown as ReturnType<typeof createNeonDb>;
  }
  return createNeonDb();
}

function createNeonDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

// Lazy initialization to avoid build-time errors when DATABASE_URL isn't set
let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

// For convenience — proxy that lazily initializes
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export type Database = ReturnType<typeof createDb>;
