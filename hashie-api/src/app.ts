import Fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

import type { AppConfig } from './config/env.js';
import { loadConfig } from './config/env.js';
import type { DatabaseHandle } from './db/client.js';
import { authPlugin } from './plugins/auth.js';
import { databasePlugin } from './plugins/database.js';
import { requestContextPlugin } from './plugins/request-context.js';
import { registerUserRoutes } from './modules/users/routes.js';
import { registerHealthRoutes } from './routes/health.js';

export type BuildAppOptions = {
  config?: AppConfig;
  database?: DatabaseHandle | undefined;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: [
        'req.headers.authorization',
        'req.headers.cookie',
        'headers.authorization',
        'headers.cookie',
        'body',
        'requestBody',
        'responseBody',
        'audio',
        'transcript',
      ],
    },
  });

  await app.register(cors, {
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : false,
  });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Hashie API',
        description: 'Local-first API boundary for Hashie health education and support.',
        version: '0.1.0',
      },
      servers: [{ url: `http://${config.host}:${config.port}` }],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(requestContextPlugin);
  await app.register(authPlugin());
  await app.register(databasePlugin, options.database ? { database: options.database } : {});

  app.get('/', async () => ({ service: 'hashie-api', status: 'ok' }));
  await registerHealthRoutes(app);
  await registerUserRoutes(app, config);

  app.setErrorHandler((error, request, reply) => {
    const safeError = error as { validation?: unknown; statusCode?: number; code?: string };
    const statusCode = safeError.validation ? 400 : safeError.statusCode && safeError.statusCode >= 400 ? safeError.statusCode : 500;
    request.log.error({ errorCode: safeError.code, statusCode }, 'request failed');
    return reply.code(statusCode).send({
      error: {
        code: statusCode === 400 ? 'invalid_request' : 'internal_error',
        message: statusCode === 400 ? 'The request could not be accepted.' : 'The server could not complete the request.',
        requestId: request.id,
      },
    });
  });

  return app;
}
