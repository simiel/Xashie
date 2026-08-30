import fp from 'fastify-plugin';

import type { DatabaseHandle } from '../db/client.js';

declare module 'fastify' {
  interface FastifyInstance {
    hashieDb: DatabaseHandle | undefined;
  }
}

export const databasePlugin = fp<{ database?: DatabaseHandle | undefined }>(async (app, options) => {
  app.decorate('hashieDb', options.database);
  app.addHook('onClose', async () => {
    await options.database?.close();
  });
});
