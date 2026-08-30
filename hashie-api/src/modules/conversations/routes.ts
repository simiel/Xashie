import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { ConversationRepository } from '../../db/repositories.js';
import type { AppConfig } from '../../config/env.js';
import { requireAuth } from '../../plugins/auth.js';

const languages = Type.Union([Type.Literal('en'), Type.Literal('tw')]);
const ageGroups = Type.Union(['under_13', '13_to_15', '16_to_17', '18_plus', 'unknown'].map(value => Type.Literal(value)));
const error = Type.Object({ error: Type.Object({ code: Type.String(), message: Type.String(), requestId: Type.Optional(Type.String()) }) });
const conversation = Type.Object({ id: Type.String(), userId: Type.String(), title: Type.Union([Type.String(), Type.Null()]), language: languages, createdAt: Type.String(), updatedAt: Type.String() });

type MessageBody = { content: string; language: 'en' | 'tw'; ageGroup: 'under_13' | '13_to_15' | '16_to_17' | '18_plus' | 'unknown' };

function writeEvent(reply: { raw: { write: (chunk: string) => boolean } }, event: string, data: unknown) { reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); }

export async function registerConversationRoutes(app: FastifyInstance, config: AppConfig) {
  const repository = () => app.hashieDb ? new ConversationRepository(app.hashieDb) : undefined;
  app.post('/v1/conversations', { preHandler: requireAuth(config), schema: { body: Type.Object({ language: languages, title: Type.Optional(Type.String({ maxLength: 160 })) }), response: { 201: conversation, 401: error, 503: error } } }, async (request, reply) => {
    if (!request.auth || !repository()) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Conversations are temporarily unavailable.', requestId: request.correlationId } });
    const userId = await repository()!.userId(request.auth.userId);
    if (!userId) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'The account is not synchronized.', requestId: request.correlationId } });
    const input = request.body as { language: 'en' | 'tw'; title?: string };
    const [record] = await repository()!.create(userId, input.language, input.title);
    return reply.code(201).send(record);
  });

  app.get('/v1/conversations', { preHandler: requireAuth(config), schema: { response: { 200: Type.Array(conversation), 401: error, 503: error } } }, async (request, reply) => {
    if (!request.auth || !repository()) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Conversations are temporarily unavailable.', requestId: request.correlationId } });
    const userId = await repository()!.userId(request.auth.userId);
    if (!userId) return [];
    return repository()!.list(userId);
  });

  app.get('/v1/conversations/:id', { preHandler: requireAuth(config), schema: { params: Type.Object({ id: Type.String() }), response: { 200: Type.Object({ id: Type.String(), userId: Type.String(), title: Type.Union([Type.String(), Type.Null()]), language: languages, createdAt: Type.String(), updatedAt: Type.String(), messages: Type.Array(Type.Object({ id: Type.String(), conversationId: Type.String(), role: Type.Union([Type.Literal('user'), Type.Literal('assistant')]), content: Type.String(), language: languages, modelVersion: Type.Union([Type.String(), Type.Null()]), policyVersion: Type.Union([Type.String(), Type.Null()]), retrievedContentIds: Type.Array(Type.String()), createdAt: Type.String() })) }), 404: error, 401: error, 503: error } } }, async (request, reply) => {
    if (!request.auth || !repository()) return reply.code(503).send({ error: { code: 'database_unavailable', message: 'Conversations are temporarily unavailable.', requestId: request.correlationId } });
    const userId = await repository()!.userId(request.auth.userId);
    const record = userId ? await repository()!.get(userId, (request.params as { id: string }).id) : undefined;
    if (!record) return reply.code(404).send({ error: { code: 'not_found', message: 'The conversation was not found.', requestId: request.correlationId } });
    return record;
  });

  app.post('/v1/conversations/:id/messages', { preHandler: requireAuth(config), schema: { params: Type.Object({ id: Type.String() }), body: Type.Object({ content: Type.String({ minLength: 1, maxLength: 20_000 }), language: languages, ageGroup: ageGroups }), response: { 200: Type.Any(), 401: error, 404: error, 503: error } } }, async (request, reply) => {
    if (!request.auth || !app.hashieDb || !app.intelligenceProvider || !app.safetyProvider || !app.retriever) return reply.code(503).send({ error: { code: 'service_unavailable', message: 'Chat is temporarily unavailable.', requestId: request.correlationId } });
    const repo = new ConversationRepository(app.hashieDb);
    const userId = await repo.userId(request.auth.userId);
    const conversationId = (request.params as { id: string }).id;
    const existing = userId ? await repo.get(userId, conversationId) : undefined;
    if (!existing || !userId) return reply.code(404).send({ error: { code: 'not_found', message: 'The conversation was not found.', requestId: request.correlationId } });
    const input = request.body as MessageBody;
    const safety = await app.safetyProvider.classify({ text: input.content, language: input.language, ageGroup: input.ageGroup });
    const abortController = new AbortController();
    request.raw.on('close', () => abortController.abort());
    await repo.addMessage({ conversationId, role: 'user', content: input.content, language: input.language });
    const hits = await app.retriever.search({ query: input.content, language: input.language, limit: 5 });
    const history = [...existing.messages, { role: 'user' as const, content: input.content, language: input.language }].map(message => ({ role: message.role, content: message.content }));
    const system = `You are Hashie, a Ghana-focused health education assistant. Respond in ${input.language === 'tw' ? 'natural Akan/Twi; do not switch to English unless the user asks or you cannot safely express a critical detail' : 'English'}. The user age group is ${input.ageGroup}. Do not diagnose, prescribe, or replace a clinician. State uncertainty and recommend appropriate human care. ${hits.length ? `Reviewed references: ${hits.map(hit => `[${hit.id}] ${hit.title}: ${hit.body}`).join('\n')}` : ''}`;
    reply.hijack();
    reply.raw.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-request-id': request.correlationId });
    writeEvent(reply, 'message.started', { requestId: request.correlationId });
    if (safety.decision !== 'allow') {
      const text = safety.decision === 'emergency_referral' ? 'Please seek urgent emergency care now. If you are in immediate danger, contact local emergency services or a trusted person nearby.' : 'I cannot safely answer this here, but a qualified health professional can help.';
      writeEvent(reply, 'message.delta', { text });
      const [saved] = await repo.addMessage({ conversationId, role: 'assistant', content: text, language: input.language, policyVersion: safety.policyVersion });
      await repo.touch(conversationId);
      writeEvent(reply, 'message.completed', { messageId: saved?.id, persisted: Boolean(saved), safety: safety.decision });
      reply.raw.end();
      return;
    }
    let answer = '';
    try {
      for await (const chunk of app.intelligenceProvider.stream({ messages: [{ role: 'system', content: system }, ...history], language: input.language, ageGroup: input.ageGroup, signal: abortController.signal })) {
        if (chunk.text) { answer += chunk.text; writeEvent(reply, 'message.delta', { text: chunk.text }); }
      }
      if (!abortController.signal.aborted && answer) {
        const [saved] = await repo.addMessage({ conversationId, role: 'assistant', content: answer, language: input.language, modelVersion: config.gatewayEnabled ? 'hashie-gateway' : 'fake', policyVersion: safety.policyVersion, retrievedContentIds: hits.map(hit => hit.id) });
        await repo.touch(conversationId);
        writeEvent(reply, 'message.completed', { messageId: saved?.id, persisted: Boolean(saved) });
      }
    } catch {
      if (!abortController.signal.aborted) writeEvent(reply, 'message.error', { code: input.language === 'tw' ? 'akan_provider_unavailable' : 'provider_unavailable', message: input.language === 'tw' ? 'Akan/Twi support is temporarily unavailable. Please try again or continue in English.' : undefined, requestId: request.correlationId });
    } finally { reply.raw.end(); }
  });
}
