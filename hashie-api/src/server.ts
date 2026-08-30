import 'dotenv/config';

import { buildApp } from './app.js';
import { loadConfig } from './config/env.js';
import { createDatabase } from './db/client.js';

const config = loadConfig();
const database = createDatabase(config.databaseUrl);
const app = await buildApp({ config, ...(database ? { database } : {}) });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error({ errorCode: error instanceof Error ? error.name : 'unknown' }, 'server failed to start');
  await database?.close();
  process.exitCode = 1;
}
