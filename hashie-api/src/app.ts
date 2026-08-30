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
import { limitsPlugin } from './plugins/limits.js';
import { registerUserRoutes } from './modules/users/routes.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerWebhookRoutes } from './modules/webhooks/routes.js';
import { registerFeedbackRoutes } from './modules/feedback/routes.js';
import { registerConversationRoutes } from './modules/conversations/routes.js';
import { GatewayIntelligenceProvider } from './providers/intelligence/gateway.js';
import { FakeIntelligenceProvider } from './providers/intelligence/fake.js';
import type { IntelligenceProvider } from './providers/intelligence/types.js';
import { RuleSafetyProvider } from './providers/safety/rules.js';
import { ConversationRepository } from './db/repositories.js';
import { DatabaseReviewedContentRetriever } from './providers/retrieval/database.js';
import type { ReviewedContentRetriever } from './providers/retrieval/types.js';
import type { SafetyProvider } from './providers/safety/types.js';

declare module 'fastify' {
  interface FastifyInstance {
    intelligenceProvider: IntelligenceProvider;
    safetyProvider: SafetyProvider;
    retriever: ReviewedContentRetriever | undefined;
  }
}

export type BuildAppOptions = {
  config?: AppConfig;
  database?: DatabaseHandle | undefined;
  intelligenceProvider?: IntelligenceProvider;
  safetyProvider?: SafetyProvider;
  retriever?: ReviewedContentRetriever;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const app = Fastify({
    bodyLimit: config.requestBodyLimitBytes,
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
  app.removeContentTypeParser('application/json');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
    const raw = typeof body === 'string' ? body : body.toString('utf8');
    request.rawBody = raw;
    try { done(null, JSON.parse(raw)); } catch (error) { done(error as Error, undefined); }
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
  await app.register(authPlugin(options.database === undefined ? {} : { database: options.database }));
  await app.register(limitsPlugin, { config });
  await app.register(databasePlugin, options.database ? { database: options.database } : {});
  const intelligenceProvider = options.intelligenceProvider ?? (config.gatewayEnabled && config.gatewayToken ? new GatewayIntelligenceProvider({ baseUrl: config.gatewayUrl, token: config.gatewayToken, timeoutMs: config.gatewayTimeoutMs, akanTimeoutMs: config.akanTimeoutMs, maxRetries: config.gatewayMaxRetries }) : new FakeIntelligenceProvider());
  app.decorate('intelligenceProvider', intelligenceProvider);
  app.decorate('safetyProvider', options.safetyProvider ?? new RuleSafetyProvider());
  app.decorate('retriever', options.retriever ?? (options.database ? new DatabaseReviewedContentRetriever(new ConversationRepository(options.database)) : undefined));

  app.get('/', async () => ({ service: 'hashie-api', status: 'ok' }));
  await registerHealthRoutes(app);
  await registerUserRoutes(app, config);
  await registerWebhookRoutes(app, config);
  await registerFeedbackRoutes(app, config);
  await registerConversationRoutes(app, config);

  app.setErrorHandler((error, request, reply) => {
    const safeError = error as { validation?: unknown; statusCode?: number; code?: string };
    const statusCode = safeError.validation ? 400 : safeError.statusCode && safeError.statusCode >= 400 ? safeError.statusCode : 500;
    request.log.error({ errorCode: safeError.code, statusCode, requestId: request.correlationId }, 'request failed');
    return reply.code(statusCode).send({
      error: {
        code: statusCode === 400 ? 'invalid_request' : 'internal_error',
        message: statusCode === 400 ? 'The request could not be accepted.' : 'The server could not complete the request.',
        requestId: request.correlationId,
      },
    });
  });

  return app;
}
