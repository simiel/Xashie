import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import type { AppConfig } from '../../config/env.js';
import { ReviewedContentRepository, type ReviewedContentStatus } from '../../db/repositories.js';
import { requireAuth, requireRole } from '../../plugins/auth.js';

const languages = Type.Union([Type.Literal('en'), Type.Literal('tw')]);
const statuses = Type.Union(['draft', 'in_review', 'approved', 'published', 'expired', 'archived'].map(value => Type.Literal(value)));
const contentBody = Type.Object({ status: Type.Optional(statuses), language: languages, topic: Type.String({ minLength: 1, maxLength: 120 }), title: Type.String({ minLength: 1, maxLength: 240 }), body: Type.String({ minLength: 1, maxLength: 100_000 }), country: Type.Optional(Type.String({ maxLength: 80 })), source: Type.String({ minLength: 1, maxLength: 500 }), author: Type.Optional(Type.String({ maxLength: 160 })), reviewer: Type.Optional(Type.String({ maxLength: 160 })), evidenceLevel: Type.Optional(Type.String({ maxLength: 80 })), reviewedAt: Type.Optional(Type.String({ format: 'date-time' })), expiresAt: Type.Optional(Type.String({ format: 'date-time' })) }, { additionalProperties: false });
const error = Type.Object({ error: Type.Object({ code: Type.String(), message: Type.String(), requestId: Type.Optional(Type.String()) }) });
const adminRoles = requireRole('admin', 'super_admin', 'content_reviewer');
const allowedTransitions: Record<ReviewedContentStatus, ReviewedContentStatus[]> = {
  draft: ['draft', 'in_review', 'archived'], in_review: ['in_review', 'approved', 'draft', 'archived'], approved: ['approved', 'published', 'in_review', 'archived'], published: ['published', 'expired', 'archived'], expired: ['expired', 'in_review', 'archived'], archived: ['archived', 'draft'],
};

function parseDate(value: string | undefined) { return value ? new Date(value) : undefined; }
function toDb(input: Record<string, unknown>) { return { ...input, ...(typeof input.reviewedAt === 'string' ? { reviewedAt: parseDate(input.reviewedAt) } : {}), ...(typeof input.expiresAt === 'string' ? { expiresAt: parseDate(input.expiresAt) } : {}) } as never; }

export async function registerContentRoutes(app: FastifyInstance, config: AppConfig) {
  app.get('/v1/content', { schema: { querystring: Type.Object({ language: Type.Optional(languages), topic: Type.Optional(Type.String({ maxLength: 120 })) }), response: { 200: Type.Array(Type.Any()), 503: error } } }, async (request, reply) => {
    if (!app.hashieDb) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Reviewed content is temporarily unavailable.', requestId: request.correlationId } });
    const query = request.query as { language?: 'en' | 'tw'; topic?: string };
    return new ReviewedContentRepository(app.hashieDb).list({ ...query, status: 'published' });
  });
  app.get('/v1/admin/reviewed-content', { preHandler: [requireAuth(config), adminRoles], schema: { querystring: Type.Object({ language: Type.Optional(languages), topic: Type.Optional(Type.String({ maxLength: 120 })), status: Type.Optional(statuses) }), response: { 200: Type.Array(Type.Any()), 401: error, 403: error, 503: error } } }, async (request, reply) => {
    if (!app.hashieDb) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Reviewed content is temporarily unavailable.', requestId: request.correlationId } });
    return new ReviewedContentRepository(app.hashieDb).list(request.query as { language?: 'en' | 'tw'; topic?: string; status?: ReviewedContentStatus });
  });
  app.get('/v1/admin/reviewed-content/:id', { preHandler: [requireAuth(config), adminRoles], schema: { params: Type.Object({ id: Type.String() }), response: { 200: Type.Any(), 404: error, 401: error, 403: error, 503: error } } }, async (request, reply) => {
    if (!app.hashieDb) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Reviewed content is temporarily unavailable.', requestId: request.correlationId } });
    const [record] = await new ReviewedContentRepository(app.hashieDb).get((request.params as { id: string }).id);
    if (!record) return reply.code(404).send({ error: { code: 'not_found', message: 'Reviewed content was not found.', requestId: request.correlationId } });
    return record;
  });
  app.post('/v1/admin/reviewed-content', { preHandler: [requireAuth(config), adminRoles], schema: { body: contentBody, response: { 201: Type.Any(), 401: error, 403: error, 409: error, 503: error } } }, async (request, reply) => {
    if (!app.hashieDb) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Reviewed content is temporarily unavailable.', requestId: request.correlationId } });
    const input = request.body as Record<string, unknown>;
    const status = (input.status as ReviewedContentStatus | undefined) ?? 'draft';
    if ((status === 'approved' || status === 'published') && (!input.reviewer || !input.reviewedAt || !input.evidenceLevel)) return reply.code(409).send({ error: { code: 'review_metadata_required', message: 'Reviewer, review date, and evidence level are required before approval or publication.', requestId: request.correlationId } } as never);
    const [record] = await new ReviewedContentRepository(app.hashieDb).create(toDb(input));
    return reply.code(201).send(record);
  });
  app.patch('/v1/admin/reviewed-content/:id', { preHandler: [requireAuth(config), adminRoles], schema: { params: Type.Object({ id: Type.String() }), body: Type.Partial(contentBody), response: { 200: Type.Any(), 404: error, 409: error, 401: error, 403: error, 503: error } } }, async (request, reply) => {
    if (!app.hashieDb) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Reviewed content is temporarily unavailable.', requestId: request.correlationId } });
    const repository = new ReviewedContentRepository(app.hashieDb);
    const id = (request.params as { id: string }).id;
    const [current] = await repository.get(id);
    if (!current) return reply.code(404).send({ error: { code: 'not_found', message: 'Reviewed content was not found.', requestId: request.correlationId } });
    const input = request.body as Record<string, unknown>;
    const nextStatus = (input.status as ReviewedContentStatus | undefined) ?? current.status;
    if (!allowedTransitions[current.status].includes(nextStatus)) return reply.code(409).send({ error: { code: 'invalid_content_transition', message: 'That publishing-state transition is not allowed.', requestId: request.correlationId } });
    const reviewer = input.reviewer ?? current.reviewer;
    const reviewedAt = input.reviewedAt ?? current.reviewedAt;
    const evidenceLevel = input.evidenceLevel ?? current.evidenceLevel;
    if ((nextStatus === 'approved' || nextStatus === 'published') && (!reviewer || !reviewedAt || !evidenceLevel)) return reply.code(409).send({ error: { code: 'review_metadata_required', message: 'Reviewer, review date, and evidence level are required before approval or publication.', requestId: request.correlationId } });
    const [record] = await repository.update(id, toDb(input));
    if (!record) return reply.code(404).send({ error: { code: 'not_found', message: 'Reviewed content was not found.', requestId: request.correlationId } });
    return record;
  });
  app.delete('/v1/admin/reviewed-content/:id', { preHandler: [requireAuth(config), adminRoles], schema: { params: Type.Object({ id: Type.String() }), response: { 200: Type.Any(), 401: error, 403: error, 503: error } } }, async (request, reply) => {
    if (!app.hashieDb) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Reviewed content is temporarily unavailable.', requestId: request.correlationId } });
    return new ReviewedContentRepository(app.hashieDb).remove((request.params as { id: string }).id);
  });
}
