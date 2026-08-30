import { verifyToken } from '@clerk/backend';
import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify';

import type { AppConfig } from '../config/env.js';

export type HashieRole = 'user' | 'admin' | 'super_admin' | 'content_reviewer' | 'support_agent' | 'auditor';

export type AuthContext = {
  userId: string;
  sessionId?: string;
  role: HashieRole;
};

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

function getBearerToken(authorization: string | undefined) {
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const token = authorization.slice('Bearer '.length).trim();
  return token || undefined;
}

function readRole(claims: Record<string, unknown>): HashieRole {
  const metadata = claims.metadata;
  if (metadata && typeof metadata === 'object' && metadata !== null) {
    const role = (metadata as Record<string, unknown>).hashieRole;
    if (role === 'admin' || role === 'super_admin' || role === 'content_reviewer' || role === 'support_agent' || role === 'auditor') {
      return role;
    }
  }
  return 'user';
}

export function authPlugin(): FastifyPluginAsync {
  return fp(async app => {
    app.decorateRequest('auth', null);
  });
}

async function authenticateRequest(config: AppConfig, request: FastifyRequest, reply: FastifyReply) {
  const token = getBearerToken(request.headers.authorization);
  if (!token || (!config.clerkSecretKey && !config.clerkJwtKey)) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'Authentication is required.' } });
  }

  try {
    const claims = await verifyToken(token, {
      secretKey: config.clerkSecretKey,
      jwtKey: config.clerkJwtKey,
      audience: config.clerkAudience,
      authorizedParties: config.clerkAuthorizedParties,
    });
    const userId = claims.sub;
    if (!userId) throw new Error('Token is missing a subject.');
    request.auth = {
      userId,
      sessionId: claims.sid,
      role: readRole(claims as unknown as Record<string, unknown>),
    };
  } catch {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'Authentication is required.' } });
  }
}

export function requireAuth(config: AppConfig): preHandlerHookHandler {
  return async (request, reply) => {
    await authenticateRequest(config, request, reply);
  };
}

export function requireRole(...allowedRoles: HashieRole[]): preHandlerHookHandler {
  return async (request, reply) => {
    if (!request.auth || !allowedRoles.includes(request.auth.role)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'You do not have access to this resource.' } });
    }
  };
}
