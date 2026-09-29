import { randomUUID } from 'node:crypto';
import { createAgentServiceFromEnv, type AgentStreamer } from './agent.js';
import { createAgentUserContext } from './agent-context.js';
import { parseAgentRequest } from './agent-validation.js';
import { createClerkVerifierFromEnv, type ClerkIdentity, type ClerkVerification, type ClerkVerifier } from './clerk.js';
import { type Actor, type Preferences, type StoredPreferences } from './contracts.js';
import { ApiError, AuthServiceError, StoreError, ValidationError } from './errors.js';
import { MemoryRateLimiter, type RateLimiter } from './rate-limit.js';
import { createGatewayTokenManagerFromEnv } from './gateway-token-manager.js';
import { createKnowledgeServiceFromEnv } from './knowledge.js';
import { createOpaqueGuestToken, guestSessionTtlMs, hashSecret, isExpired, toIso } from './security.js';
import { createDataStoreFromEnv, type DataStore } from './store.js';
import { parseBearerToken, parseIdempotencyKey, parsePreferencesPatch, parseUpgradeConsent } from './validation.js';

type SignedOut = { type: 'signed-out' };
type ResolvedActor = Actor | SignedOut;

export type AppDependencies = {
  store: DataStore;
  clerk: ClerkVerifier;
  rateLimiter: RateLimiter;
  agent?: AgentStreamer | null;
  now?: () => Date;
  requestId?: () => string;
};

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const guestSessionLimit = { limit: 5, windowMs: 60_000 };
const upgradeLimit = { limit: 5, windowMs: 60_000 };
const agentActorLimit = { limit: 8, windowMs: 60_000 };
const agentClientLimit = { limit: 20, windowMs: 60_000 };

function responseJson(requestId: string, status: number, value: unknown, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...jsonHeaders, 'x-request-id': requestId, ...extraHeaders },
  });
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(rateLimiter: RateLimiter, key: string, policy: { limit: number; windowMs: number }, now: Date): void {
  const result = rateLimiter.check(key, policy.limit, policy.windowMs, now);
  if (!result.allowed) {
    throw new ApiError(429, 'rate_limited', 'Too many requests. Please try again later.', {
      'retry-after': String(result.retryAfterSeconds),
    });
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  const contentLength = request.headers.get('content-length');
  if (contentLength && Number.isFinite(Number(contentLength)) && Number(contentLength) > 32_768) {
    throw new ApiError(413, 'bad_request', 'Request body is too large.');
  }
  const text = await request.text();
  if (Buffer.byteLength(text, 'utf8') > 32_768) throw new ApiError(413, 'bad_request', 'Request body is too large.');
  try {
    return JSON.parse(text);
  } catch {
    throw new ValidationError('Request body must contain valid JSON.');
  }
}

function publicPreferences(value: StoredPreferences | null): (Preferences & { updatedAt: string }) | null {
  if (!value) return null;
  return {
    language: value.language,
    nickname: value.nickname,
    ageGroup: value.ageGroup,
    accessibilityPreferences: [...value.accessibilityPreferences],
    updatedAt: value.updatedAt,
  };
}

function actorPayload(actor: Actor): Record<string, unknown> {
  if (actor.type === 'guest') {
    return {
      type: actor.type,
      sessionId: actor.sessionId,
      capabilities: { persistentPreferences: false, canUpgrade: true, canDeletePreferences: true },
    };
  }
  return {
    type: actor.type,
    userId: actor.userId,
    sessionId: actor.sessionId,
    capabilities: { persistentPreferences: true, canUpgrade: false, canDeletePreferences: true },
  };
}

function ownerFor(actor: Actor): { ownerType: 'guest' | 'clerk-user'; ownerId: string } {
  return actor.type === 'guest'
    ? { ownerType: 'guest', ownerId: actor.sessionId }
    : { ownerType: 'clerk-user', ownerId: actor.userId };
}

function requestCredentials(request: Request): { guestToken: string | null; bearerToken: string | null } {
  const guestToken = request.headers.get('x-hashie-guest-token');
  const bearerToken = parseBearerToken(request.headers.get('authorization'));
  if (guestToken && bearerToken) throw new ApiError(400, 'conflicting_credentials', 'Use one credential type for this request.');
  return { guestToken, bearerToken };
}

function logClerkRejection(requestId: string, verification: Extract<ClerkVerification, { status: 'invalid' }>): void {
  if (!verification.diagnostic) return;
  // Never log a token, session ID, user ID, or Clerk secret. These bounded values
  // identify a configuration mismatch in Render without disclosing account data.
  console.warn('[Hashie auth] Clerk token rejected', { requestId, ...verification.diagnostic });
}

async function resolveClerk(bearerToken: string, verifier: ClerkVerifier, requestId: string): Promise<Actor> {
  const verification: ClerkVerification = await verifier.verifyBearerToken(bearerToken);
  if (verification.status !== 'authenticated') {
    logClerkRejection(requestId, verification);
    throw new ApiError(401, 'invalid_credentials', 'Credentials are invalid or expired.');
  }
  const identity: ClerkIdentity = verification.identity;
  return { type: 'clerk-user', userId: identity.userId, sessionId: identity.sessionId };
}

async function resolveActor(request: Request, deps: AppDependencies, now: Date, requestId: string): Promise<ResolvedActor> {
  const { guestToken, bearerToken } = requestCredentials(request);
  if (guestToken) {
    const record = await deps.store.findGuestSessionByTokenHash(hashSecret(guestToken));
    if (!record || record.revokedAt || isExpired(record.expiresAt, now)) {
      throw new ApiError(401, 'invalid_credentials', 'Credentials are invalid or expired.');
    }
    return { type: 'guest', sessionId: record.id };
  }
  if (bearerToken) return resolveClerk(bearerToken, deps.clerk, requestId);
  return { type: 'signed-out' };
}

function requireActor(actor: ResolvedActor): Actor {
  if (actor.type === 'signed-out') throw new ApiError(401, 'unauthorized', 'Authentication is required.');
  return actor;
}

async function resolveUpgrade(request: Request, deps: AppDependencies, now: Date, requestId: string): Promise<{ guest: Actor & { type: 'guest' }; clerk: Actor & { type: 'clerk-user' } }> {
  const guestToken = request.headers.get('x-hashie-guest-token');
  const bearerToken = parseBearerToken(request.headers.get('authorization'));
  if (!guestToken || !bearerToken) throw new ApiError(401, 'unauthorized', 'Guest and Clerk credentials are required for upgrade.');
  const record = await deps.store.findGuestSessionByTokenHash(hashSecret(guestToken));
  if (!record || (!record.revokedAt && isExpired(record.expiresAt, now))) throw new ApiError(401, 'invalid_credentials', 'Guest credentials are invalid or expired.');
  const clerk = await resolveClerk(bearerToken, deps.clerk, requestId);
  return { guest: { type: 'guest', sessionId: record.id }, clerk: clerk as Actor & { type: 'clerk-user' } };
}

function createRuntimeDependencies(env: NodeJS.ProcessEnv = process.env): AppDependencies {
  const gateway = createGatewayTokenManagerFromEnv(env);
  return {
    store: createDataStoreFromEnv(env),
    clerk: createClerkVerifierFromEnv(env),
    rateLimiter: new MemoryRateLimiter(),
    agent: createAgentServiceFromEnv(env, gateway, createKnowledgeServiceFromEnv(env)),
  };
}

export function createApp(deps: AppDependencies): (request: Request) => Promise<Response> {
  const nowProvider = deps.now ?? (() => new Date());
  const requestIdProvider = deps.requestId ?? (() => randomUUID());

  return async function app(request: Request): Promise<Response> {
    const requestId = requestIdProvider();
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/$/, '') || '/';
      const now = nowProvider();

      if (['/health', '/healthz'].includes(path) && request.method === 'GET') {
        return responseJson(requestId, 200, { ok: true, service: 'hashie-backend', version: 'v1' });
      }

      if (path === '/v1/guest-sessions' && request.method === 'POST') {
        if (request.headers.get('x-hashie-guest-token') || request.headers.get('authorization')) {
          throw new ApiError(400, 'conflicting_credentials', 'Start a guest session without credentials.');
        }
        checkRateLimit(deps.rateLimiter, `guest-session:${clientKey(request)}`, guestSessionLimit, now);
        const token = createOpaqueGuestToken();
        const createdAt = toIso(now);
        const expiresAt = toIso(new Date(now.getTime() + guestSessionTtlMs));
        await deps.store.createGuestSession({
          id: randomUUID(),
          tokenHash: hashSecret(token),
          createdAt,
          expiresAt,
          revokedAt: null,
          upgradedToClerkUserId: null,
          upgradeIdempotencyKeyHash: null,
        });
        return responseJson(requestId, 201, {
          token,
          session: { actor: 'guest', expiresAt },
        });
      }

      if (path === '/v1/guest-sessions/upgrade' && request.method === 'POST') {
        const { guest, clerk } = await resolveUpgrade(request, deps, now, requestId);
        checkRateLimit(deps.rateLimiter, `upgrade:${guest.sessionId}`, upgradeLimit, now);
        const idempotencyKey = parseIdempotencyKey(request.headers.get('idempotency-key'));
        parseUpgradeConsent(await readJsonBody(request));
        const result = await deps.store.upgradeGuestSession(guest.sessionId, clerk.userId, hashSecret(idempotencyKey), toIso(now));
        return responseJson(requestId, 200, { actor: actorPayload(clerk), ...result });
      }

      if (path === '/v1/session' && request.method === 'GET') {
        const actor = await resolveActor(request, deps, now, requestId);
        return responseJson(requestId, 200, actor.type === 'signed-out'
          ? { actor: null, status: 'signed-out', capabilities: { persistentPreferences: false, canUpgrade: false, canDeletePreferences: false } }
          : { actor: actorPayload(actor), status: 'authenticated' });
      }

      if (path === '/v1/me/preferences' && ['GET', 'PATCH', 'DELETE'].includes(request.method)) {
        const actor = requireActor(await resolveActor(request, deps, now, requestId));
        const owner = ownerFor(actor);
        if (request.method === 'GET') {
          return responseJson(requestId, 200, { actor: actorPayload(actor), preferences: publicPreferences(await deps.store.getPreferences(owner.ownerType, owner.ownerId)) });
        }
        if (request.method === 'DELETE') {
          await deps.store.deletePreferences(owner.ownerType, owner.ownerId);
          return responseJson(requestId, 200, { deleted: true });
        }
        const preferences = await deps.store.upsertPreferences(owner.ownerType, owner.ownerId, parsePreferencesPatch(await readJsonBody(request)), toIso(now));
        return responseJson(requestId, 200, { actor: actorPayload(actor), preferences: publicPreferences(preferences) });
      }

      if (path === '/v1/agent/stream' && request.method === 'POST') {
        const actor = requireActor(await resolveActor(request, deps, now, requestId));
        if (!deps.agent) throw new AuthServiceError('not_configured');
        const actorId = actor.type === 'guest' ? actor.sessionId : actor.userId;
        checkRateLimit(deps.rateLimiter, `agent:actor:${actor.type}:${actorId}`, agentActorLimit, now);
        checkRateLimit(deps.rateLimiter, `agent:ip:${clientKey(request)}`, agentClientLimit, now);
        const agentRequest = parseAgentRequest(await readJsonBody(request));
        const owner = ownerFor(actor);
        const preferences = await deps.store.getPreferences(owner.ownerType, owner.ownerId);
        return deps.agent.stream({ ...agentRequest, actor, userContext: createAgentUserContext(actor, preferences), abortSignal: request.signal, requestId });
      }

      throw new ApiError(404, 'not_found', 'Route not found.');
    } catch (error) {
      if (error instanceof ApiError) return responseJson(requestId, error.status, { error: { code: error.code, message: error.message }, requestId }, error.headers);
      if (error instanceof ValidationError) return responseJson(requestId, 400, { error: { code: 'validation_error', message: error.message }, requestId });
      if (error instanceof AuthServiceError) return responseJson(requestId, 503, { error: { code: 'service_not_configured', message: 'Authentication service is not configured.' }, requestId });
      if (error instanceof StoreError) {
        const status = error.code === 'inactive' ? 401 : error.code === 'conflict' ? 409 : 503;
        const code = error.code === 'inactive' ? 'invalid_credentials' : error.code === 'conflict' ? 'upgrade_conflict' : error.code === 'not_configured' ? 'service_not_configured' : 'service_unavailable';
        return responseJson(requestId, status, { error: { code, message: error.code === 'conflict' || error.code === 'inactive' ? error.message : 'This API capability is temporarily unavailable.' }, requestId });
      }
      return responseJson(requestId, 500, { error: { code: 'service_unavailable', message: 'The request could not be completed.' }, requestId });
    }
  };
}

export async function handleRequest(request: Request, deps = createRuntimeDependencies()): Promise<Response> {
  return createApp(deps)(request);
}
