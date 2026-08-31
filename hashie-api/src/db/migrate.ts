import 'dotenv/config';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { createDatabase } from './client.js';

const database = createDatabase(process.env.DATABASE_URL);

if (!database) {
  throw new Error('DATABASE_URL is required for migrations.');
}

try {
  await migrate(database.db, { migrationsFolder: process.env.MIGRATIONS_FOLDER ?? './drizzle' });
} finally {
  await database.close();
}
