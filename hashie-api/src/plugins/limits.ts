import fp from 'fastify-plugin';
import type { AppConfig } from '../config/env.js';

type Bucket = { count: number; resetAt: number };

export class MemoryRateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  constructor(private readonly max: number, private readonly windowMs: number) {}
  consume(key: string, now = Date.now()) {
    const current = this.buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + this.windowMs } : current;
    bucket.count += 1;
    this.buckets.set(key, bucket);
    if (this.buckets.size > 10_000) for (const [candidate, value] of this.buckets) if (value.resetAt <= now) this.buckets.delete(candidate);
    return { allowed: bucket.count <= this.max, remaining: Math.max(0, this.max - bucket.count), resetAt: bucket.resetAt };
  }
}

export const limitsPlugin = fp<{ config: AppConfig }>(async (app, { config }) => {
  const store = new MemoryRateLimitStore(config.rateLimitMax, config.rateLimitWindowMs);
  app.addHook('onRequest', async (request, reply) => {
    const result = store.consume(request.ip);
    reply.header('x-ratelimit-limit', config.rateLimitMax);
    reply.header('x-ratelimit-remaining', result.remaining);
    reply.header('x-ratelimit-reset', Math.ceil(result.resetAt / 1000));
    if (!result.allowed) {
      reply.header('retry-after', Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)));
      return reply.code(429).send({ error: { code: 'rate_limited', message: 'Too many requests.', requestId: request.correlationId } });
    }
  });
});
