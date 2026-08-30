import { verifyWebhook } from '@clerk/backend/webhooks';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config/env.js';
import { webhookEvents } from '../../db/schema.js';

export async function registerWebhookRoutes(app: FastifyInstance, config: AppConfig) {
  app.post('/webhooks/clerk', async (request, reply) => {
    if (!config.clerkWebhookSigningSecret || typeof request.rawBody !== 'string' || !app.hashieDb) return reply.code(503).send({ error: { code: 'webhook_unavailable', message: 'Webhook processing is not configured.', requestId: request.correlationId } });
    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(request.headers)) if (typeof value === 'string') headers.set(key, value);
      const event = await verifyWebhook(new Request('http://hashie.local/webhooks/clerk', { method: 'POST', headers, body: request.rawBody }), { signingSecret: config.clerkWebhookSigningSecret });
      const eventId = request.headers['svix-id'];
      if (typeof eventId !== 'string') return reply.code(400).send({ error: { code: 'invalid_webhook', message: 'The webhook could not be verified.', requestId: request.correlationId } });
      const data = event.data as { id?: string };
      if ((event.type === 'user.created' || event.type === 'user.updated' || event.type === 'user.deleted') && !data.id) return reply.code(400).send({ error: { code: 'invalid_webhook', message: 'The webhook could not be verified.', requestId: request.correlationId } });
      const [stored] = await app.hashieDb.db.insert(webhookEvents).values({ eventId, eventType: event.type }).onConflictDoNothing().returning();
      if (!stored) return reply.code(200).send({ ok: true });
      if (event.type === 'user.created' || event.type === 'user.updated') await app.userRepository?.ensure(data.id as string);
      if (event.type === 'user.deleted' && data.id) await app.userRepository?.deleteByClerkUserId(data.id, request.correlationId);
      return reply.code(200).send({ ok: true });
    } catch { return reply.code(400).send({ error: { code: 'invalid_webhook', message: 'The webhook could not be verified.', requestId: request.correlationId } }); }
  });
}
