import { randomUUID } from 'node:crypto';

import fp from 'fastify-plugin';

declare module 'fastify' { interface FastifyRequest { correlationId: string; rawBody?: string; } }

export const requestContextPlugin = fp(async app => {
  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && /^[a-zA-Z0-9._:-]{1,100}$/.test(incoming) ? incoming : randomUUID();
    request.correlationId = requestId;
    reply.header('x-request-id', requestId);
  });
});
