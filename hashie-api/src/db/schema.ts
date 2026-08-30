import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const languageEnum = pgEnum('hashie_language', ['en', 'tw']);
export const ageGroupEnum = pgEnum('hashie_age_group', ['under_13', '13_to_15', '16_to_17', '18_plus', 'unknown']);
export const roleEnum = pgEnum('hashie_role', ['user', 'admin', 'super_admin', 'content_reviewer', 'support_agent', 'auditor']);
export const messageRoleEnum = pgEnum('hashie_message_role', ['user', 'assistant']);
export const contentStatusEnum = pgEnum('hashie_content_status', ['draft', 'in_review', 'approved', 'published', 'expired', 'archived']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  roleSnapshot: roleEnum('role_snapshot').notNull().default('user'),
  suspended: boolean('suspended').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  clerkUserIdUnique: uniqueIndex('users_clerk_user_id_unique').on(table.clerkUserId),
}));

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  language: languageEnum('language').notNull().default('en'),
  ageGroup: ageGroupEnum('age_group').notNull().default('unknown'),
  accessibility: jsonb('accessibility').$type<Record<string, boolean>>().notNull().default({}),
  voiceFirst: boolean('voice_first').notNull().default(false),
  supportInterests: jsonb('support_interests').$type<string[]>().notNull().default([]),
  region: text('region'),
  completed: boolean('completed').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),
  language: languageEnum('language').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  userUpdatedIndex: index('conversations_user_updated_idx').on(table.userId, table.updatedAt),
}));

export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: messageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  language: languageEnum('language').notNull(),
  modelVersion: text('model_version'),
  policyVersion: text('policy_version'),
  retrievedContentIds: jsonb('retrieved_content_ids').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  conversationCreatedIndex: index('messages_conversation_created_idx').on(table.conversationId, table.createdAt),
}));

export const reviewedContent = pgTable('reviewed_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: contentStatusEnum('status').notNull().default('draft'),
  language: languageEnum('language').notNull(),
  topic: text('topic').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  country: text('country').notNull().default('Ghana'),
  source: text('source').notNull(),
  author: text('author'),
  reviewer: text('reviewer'),
  evidenceLevel: text('evidence_level'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  publishedLanguageIndex: index('reviewed_content_status_language_idx').on(table.status, table.language),
}));

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorClerkUserId: text('actor_clerk_user_id'),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id'),
  reason: text('reason'),
  outcome: text('outcome').notNull(),
  requestId: text('request_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  actorCreatedIndex: index('audit_events_actor_created_idx').on(table.actorClerkUserId, table.createdAt),
}));

export const idempotencyKeys = pgTable('idempotency_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  key: text('key').notNull(),
  requestHash: text('request_hash').notNull(),
  responseStatus: integer('response_status'),
  responseBody: jsonb('response_body').$type<Record<string, unknown>>(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({
  ownerKeyUnique: uniqueIndex('idempotency_keys_owner_key_unique').on(table.clerkUserId, table.key),
}));

export const feedback = pgTable('feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  messageId: uuid('message_id').references(() => messages.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({ userCreatedIndex: index('feedback_user_created_idx').on(table.clerkUserId, table.createdAt) }));

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  eventId: text('event_id').notNull(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
}, table => ({ eventUnique: uniqueIndex('webhook_events_event_id_unique').on(table.eventId) }));

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles),
  conversations: many(conversations),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));
