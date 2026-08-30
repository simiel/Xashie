import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IdempotencyRepository } from '../../db/repositories.js';

export function requestHash(body: unknown) { return createHash('sha256').update(JSON.stringify(body ?? null)).digest('hex'); }

export async function replayOrReserve(request: FastifyRequest, reply: FastifyReply, repository: IdempotencyRepository) {
  const key = request.headers['idempotency-key'];
  if (typeof key !== 'string' || !/^[a-zA-Z0-9._-]{8,128}$/.test(key) || !request.auth) return undefined;
  const hash = requestHash(request.body);
  const [existing] = await repository.get(request.auth.userId, key);
  if (existing) {
    if (existing.requestHash !== hash) return reply.code(409).send({ error: { code: 'idempotency_conflict', message: 'The idempotency key was used with a different request.', requestId: request.correlationId } });
    if (existing.responseStatus && existing.responseBody) return reply.code(existing.responseStatus).send(existing.responseBody);
    return reply.code(409).send({ error: { code: 'request_in_progress', message: 'That request is already being processed.', requestId: request.correlationId } });
  }
  const [reserved] = await repository.reserve({ clerkUserId: request.auth.userId, key, requestHash: hash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  if (!reserved) return reply.code(409).send({ error: { code: 'request_in_progress', message: 'That request is already being processed.', requestId: request.correlationId } });
  return { key };
}
