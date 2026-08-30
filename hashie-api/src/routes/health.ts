import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';

const statusResponse = Type.Object({
  status: Type.String(),
  service: Type.String(),
  database: Type.Optional(Type.String()),
});

export async function registerHealthRoutes(app: FastifyInstance) {
  app.get('/health', { schema: { response: { 200: statusResponse } } }, async () => ({
    status: 'ok',
    service: 'hashie-api',
  }));

  app.get('/ready', { schema: { response: { 200: statusResponse, 503: statusResponse } } }, async (_request, reply) => {
    const databaseReady = app.hashieDb ? await app.hashieDb.ping() : false;
    if (!databaseReady) {
      return reply.code(503).send({ status: 'not_ready', service: 'hashie-api', database: 'unavailable' });
    }
    return { status: 'ready', service: 'hashie-api', database: 'ok' };
  });
}
