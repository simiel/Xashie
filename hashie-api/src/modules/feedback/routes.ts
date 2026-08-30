import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { FeedbackRepository } from '../../db/repositories.js';
import { requireAuth } from '../../plugins/auth.js';
import type { AppConfig } from '../../config/env.js';

export async function registerFeedbackRoutes(app: FastifyInstance, config: AppConfig) {
  app.post('/v1/messages/:messageId/feedback', { preHandler: requireAuth(config), schema: { params: Type.Object({ messageId: Type.String() }), body: Type.Object({ rating: Type.Integer({ minimum: 1, maximum: 5 }), comment: Type.Optional(Type.String({ maxLength: 2000 })) }, { additionalProperties: false }), response: { 201: Type.Object({ id: Type.String() }), 404: Type.Any(), 503: Type.Any() } } }, async (request, reply) => {
    if (!request.auth || !app.hashieDb) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Feedback is temporarily unavailable.', requestId: request.correlationId } } as never);
    const input = request.body as { rating: number; comment?: string };
    const messageId = (request.params as { messageId: string }).messageId;
    const repository = new FeedbackRepository(app.hashieDb);
    if (!(await repository.messageBelongsToUser(messageId, request.auth.userId))) return reply.code(404).send({ error: { code: 'not_found', message: 'The message was not found.', requestId: request.correlationId } } as never);
    const [record] = await repository.create({ clerkUserId: request.auth.userId, rating: input.rating, messageId, ...(input.comment ? { comment: input.comment } : {}) });
    return reply.code(201).send({ id: record?.id ?? '' });
  });
}
