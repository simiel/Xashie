import { and, eq, gt, ilike, isNull, lt, or } from 'drizzle-orm';
import { auditEvents, conversations, feedback, idempotencyKeys, messages, reviewedContent, userProfiles, users } from './schema.js';
import type { DatabaseHandle } from './client.js';

export class UserRepository {
  constructor(private readonly database: DatabaseHandle) {}
  async ensure(clerkUserId: string, role: typeof users.$inferInsert.roleSnapshot = 'user') {
    const [user] = await this.database.db.insert(users).values({ clerkUserId, roleSnapshot: role }).onConflictDoUpdate({ target: users.clerkUserId, set: { roleSnapshot: role, updatedAt: new Date() } }).returning();
    if (!user) throw new Error('user_sync_failed');
    return user;
  }
  async deleteByClerkUserId(clerkUserId: string, requestId?: string) {
    return this.database.db.transaction(async tx => {
      await tx.insert(auditEvents).values({ action: 'account.deleted', targetType: 'user', outcome: 'completed', requestId, metadata: { retention: 'deleted' } });
      return tx.delete(users).where(eq(users.clerkUserId, clerkUserId));
    });
  }
}

export class ConversationRepository {
  constructor(private readonly database: DatabaseHandle) {}
  async userId(clerkUserId: string) { const [user] = await this.database.db.select({ id: users.id }).from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1); return user?.id; }
  list(userId: string) { return this.database.db.select().from(conversations).where(eq(conversations.userId, userId)).orderBy(conversations.updatedAt); }
  async get(userId: string, conversationId: string) {
    const [conversation] = await this.database.db.select().from(conversations).where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId))).limit(1);
    if (!conversation) return undefined;
    const conversationMessages = await this.database.db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
    return { ...conversation, messages: conversationMessages };
  }
  create(userId: string, language: 'en' | 'tw', title?: string) { return this.database.db.insert(conversations).values({ userId, language, ...(title === undefined ? {} : { title }) }).returning(); }
  addMessage(message: typeof messages.$inferInsert) { return this.database.db.insert(messages).values(message).returning(); }
  touch(conversationId: string) { return this.database.db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId)); }
  profile(userId: string) { return this.database.db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1); }
  reviewed(language: 'en' | 'tw', query: string, topic?: string, limit = 5) { const term = `%${query.slice(0, 200)}%`; const topicTerm = topic ? `%${topic.slice(0, 120)}%` : undefined; return this.database.db.select({ id: reviewedContent.id, title: reviewedContent.title, body: reviewedContent.body, source: reviewedContent.source }).from(reviewedContent).where(and(eq(reviewedContent.language, language), eq(reviewedContent.status, 'published'), or(isNull(reviewedContent.expiresAt), gt(reviewedContent.expiresAt, new Date())), topicTerm ? ilike(reviewedContent.topic, topicTerm) : undefined, or(ilike(reviewedContent.title, term), ilike(reviewedContent.body, term)))).limit(limit); }
}

export type ReviewedContentStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'expired' | 'archived';
export class ReviewedContentRepository {
  constructor(private readonly database: DatabaseHandle) {}
  list(input: { language?: 'en' | 'tw'; topic?: string; status?: ReviewedContentStatus }) {
    return this.database.db.select().from(reviewedContent).where(and(input.language ? eq(reviewedContent.language, input.language) : undefined, input.topic ? ilike(reviewedContent.topic, `%${input.topic.slice(0, 120)}%`) : undefined, input.status ? eq(reviewedContent.status, input.status) : undefined, input.status === 'published' ? or(isNull(reviewedContent.expiresAt), gt(reviewedContent.expiresAt, new Date())) : undefined)).orderBy(reviewedContent.updatedAt);
  }
  get(id: string) { return this.database.db.select().from(reviewedContent).where(eq(reviewedContent.id, id)).limit(1); }
  create(input: typeof reviewedContent.$inferInsert) { return this.database.db.insert(reviewedContent).values(input).returning(); }
  update(id: string, input: Partial<typeof reviewedContent.$inferInsert>) { return this.database.db.update(reviewedContent).set({ ...input, updatedAt: new Date() }).where(eq(reviewedContent.id, id)).returning(); }
  remove(id: string) { return this.database.db.update(reviewedContent).set({ status: 'archived', updatedAt: new Date() }).where(eq(reviewedContent.id, id)).returning({ id: reviewedContent.id, status: reviewedContent.status }); }
}

export class FeedbackRepository {
  constructor(private readonly database: DatabaseHandle) {}
  async messageBelongsToUser(messageId: string, clerkUserId: string) {
    const [record] = await this.database.db.select({ id: messages.id }).from(messages).innerJoin(conversations, eq(messages.conversationId, conversations.id)).innerJoin(users, eq(conversations.userId, users.id)).where(and(eq(messages.id, messageId), eq(users.clerkUserId, clerkUserId))).limit(1);
    return Boolean(record);
  }
  create(input: typeof feedback.$inferInsert) { return this.database.db.insert(feedback).values(input).returning(); }
}

export class AuditRepository {
  constructor(private readonly database: DatabaseHandle) {}
  create(input: typeof auditEvents.$inferInsert) { return this.database.db.insert(auditEvents).values(input).returning(); }
}

export class IdempotencyRepository {
  constructor(private readonly database: DatabaseHandle) {}
  get(clerkUserId: string, key: string) { return this.database.db.select().from(idempotencyKeys).where(and(eq(idempotencyKeys.clerkUserId, clerkUserId), eq(idempotencyKeys.key, key))).limit(1); }
  reserve(input: typeof idempotencyKeys.$inferInsert) { return this.database.db.insert(idempotencyKeys).values(input).onConflictDoNothing().returning(); }
  complete(id: string, responseStatus: number, responseBody: Record<string, unknown>) { return this.database.db.update(idempotencyKeys).set({ responseStatus, responseBody }).where(eq(idempotencyKeys.id, id)); }
  purgeExpired(now = new Date()) { return this.database.db.delete(idempotencyKeys).where(lt(idempotencyKeys.expiresAt, now)); }
}
