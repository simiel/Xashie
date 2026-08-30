import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';

import type { AppConfig } from '../../config/env.js';
import { userProfiles, users } from '../../db/schema.js';
import { requireAuth } from '../../plugins/auth.js';

const ageGroups = ['under_13', '13_to_15', '16_to_17', '18_plus', 'unknown'] as const;
const languages = ['en', 'tw'] as const;

const profilePatch = Type.Object({
  language: Type.Optional(Type.Union(languages.map(value => Type.Literal(value)))),
  ageGroup: Type.Optional(Type.Union(ageGroups.map(value => Type.Literal(value)))),
  accessibility: Type.Optional(Type.Record(Type.String({ maxLength: 64 }), Type.Boolean())),
  voiceFirst: Type.Optional(Type.Boolean()),
  supportInterests: Type.Optional(Type.Array(Type.String({ maxLength: 80 }), { maxItems: 20 })),
  region: Type.Optional(Type.String({ maxLength: 120 })),
  completed: Type.Optional(Type.Boolean()),
}, { additionalProperties: false });

const profileResponse = Type.Object({
  userId: Type.String(),
  role: Type.String(),
  profile: Type.Object({
    language: Type.Union(languages.map(value => Type.Literal(value))),
    ageGroup: Type.Union(ageGroups.map(value => Type.Literal(value))),
    accessibility: Type.Record(Type.String(), Type.Boolean()),
    voiceFirst: Type.Boolean(),
    supportInterests: Type.Array(Type.String()),
    region: Type.Union([Type.String(), Type.Null()]),
    completed: Type.Boolean(),
  }),
});

const errorResponse = Type.Object({
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    requestId: Type.Optional(Type.String()),
  }),
});

export async function registerUserRoutes(app: FastifyInstance, config: AppConfig) {
  app.get('/v1/me', {
    preHandler: requireAuth(config),
    schema: { response: { 200: profileResponse, 401: errorResponse, 503: errorResponse } },
  }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: { code: 'unauthorized', message: 'Authentication is required.' } });
    if (!app.hashieDb) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'The profile service is temporarily unavailable.' } });
    const auth = request.auth;

    const record = await app.hashieDb.db.transaction(async transaction => {
      const [user] = await transaction.insert(users)
        .values({ clerkUserId: auth.userId, roleSnapshot: auth.role })
        .onConflictDoUpdate({ target: users.clerkUserId, set: { roleSnapshot: auth.role, updatedAt: new Date() } })
        .returning({ id: users.id, clerkUserId: users.clerkUserId, roleSnapshot: users.roleSnapshot });
      if (!user) throw new Error('The user record could not be created.');

      await transaction.insert(userProfiles).values({ userId: user.id }).onConflictDoNothing();
      const [profile] = await transaction.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
      return { user, profile };
    });

    return {
      userId: record.user.clerkUserId,
      role: record.user.roleSnapshot,
      profile: record.profile,
    };
  });

  app.patch('/v1/me', {
    preHandler: requireAuth(config),
    schema: { body: profilePatch, response: { 200: profileResponse, 401: errorResponse, 503: errorResponse } },
  }, async (request, reply) => {
    if (!request.auth) return reply.code(401).send({ error: { code: 'unauthorized', message: 'Authentication is required.' } });
    if (!app.hashieDb) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'The profile service is temporarily unavailable.' } });
    const auth = request.auth;

    const change = request.body as {
      language?: (typeof languages)[number];
      ageGroup?: (typeof ageGroups)[number];
      accessibility?: Record<string, boolean>;
      voiceFirst?: boolean;
      supportInterests?: string[];
      region?: string;
      completed?: boolean;
    };

    const result = await app.hashieDb.db.transaction(async transaction => {
      const [user] = await transaction.insert(users)
        .values({ clerkUserId: auth.userId, roleSnapshot: auth.role })
        .onConflictDoUpdate({ target: users.clerkUserId, set: { roleSnapshot: auth.role, updatedAt: new Date() } })
        .returning({ id: users.id, clerkUserId: users.clerkUserId, roleSnapshot: users.roleSnapshot });
      if (!user) throw new Error('The user record could not be created.');

      await transaction.insert(userProfiles).values({ userId: user.id }).onConflictDoNothing();
      const [profile] = await transaction.update(userProfiles)
        .set({ ...change, updatedAt: new Date() })
        .where(eq(userProfiles.userId, user.id))
        .returning();
      return { user, profile };
    });

    return { userId: result.user.clerkUserId, role: result.user.roleSnapshot, profile: result.profile };
  });
}
