import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

export type DatabaseHandle = {
  db: ReturnType<typeof drizzle>;
  pool: Pool;
  ping: () => Promise<boolean>;
  close: () => Promise<void>;
};

export function createDatabase(databaseUrl: string | undefined): DatabaseHandle | undefined {
  if (!databaseUrl) return undefined;

  const pool = new Pool({ connectionString: databaseUrl, max: 10 });
  const db = drizzle(pool, { schema });

  return {
    db,
    pool,
    async ping() {
      try {
        await pool.query('select 1');
        return true;
      } catch {
        return false;
      }
    },
    async close() {
      await pool.end();
    },
  };
}
