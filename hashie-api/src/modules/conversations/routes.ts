import { Type } from '@sinclair/typebox';
import type { FastifyInstance } from 'fastify';
import { ConversationRepository } from '../../db/repositories.js';
import type { AppConfig } from '../../config/env.js';
import { requireAuth } from '../../plugins/auth.js';
import { buildHashieSystemPrompt, HASHIE_SYSTEM_PROMPT_VERSION } from '../../providers/intelligence/system-prompt.js';

const languages = Type.Union([Type.Literal('en'), Type.Literal('tw')]);
const ageGroups = Type.Union(['under_13', '13_to_15', '16_to_17', '18_plus', 'unknown'].map(value => Type.Literal(value)));
const error = Type.Object({ error: Type.Object({ code: Type.String(), message: Type.String(), requestId: Type.Optional(Type.String()) }) });
const conversation = Type.Object({ id: Type.String(), userId: Type.String(), title: Type.Union([Type.String(), Type.Null()]), language: languages, createdAt: Type.String(), updatedAt: Type.String() });

type MessageBody = { content: string; language: 'en' | 'tw'; ageGroup: 'under_13' | '13_to_15' | '16_to_17' | '18_plus' | 'unknown' };
type ProviderMessage = { role: 'user' | 'assistant'; content: string };

function normalizeProviderHistory(messages: ProviderMessage[]) {
  return messages.reduce<ProviderMessage[]>((normalized, message) => {
    const previous = normalized.at(-1);
    if (previous?.role === message.role) previous.content += `\n${message.content}`;
    else normalized.push({ ...message });
    return normalized;
  }, []);
}

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

  app.get('/v1/conversations/:id', { preHandler: requireAuth(config), schema: { params: Type.Object({ id: Type.String() }), response: { 200: Type.Object({ id: Type.String(), userId: Type.String(), title: Type.Union([Type.String(), Type.Null()]), language: languages, createdAt: Type.String(), updatedAt: Type.String(), messages: Type.Array(Type.Object({ id: Type.String(), conversationId: Type.String(), role: Type.Union([Type.Literal('user'), Type.Literal('assistant')]), content: Type.String(), language: languages, modelVersion: Type.Union([Type.String(), Type.Null()]), policyVersion: Type.Union([Type.String(), Type.Null()]), retrievedContentIds: Type.Array(Type.String()), safetyResult: Type.Optional(Type.Union([Type.Object({ decision: Type.String(), reasons: Type.Array(Type.String()) }), Type.Null()])), createdAt: Type.String() })) }), 404: error, 401: error, 503: error } } }, async (request, reply) => {
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
    const [profile] = await repo.profile(userId);
    const language = profile?.language ?? input.language;
    const ageGroup = profile?.ageGroup ?? input.ageGroup;
    const safety = await app.safetyProvider.classify({ text: input.content, language, ageGroup });
    const abortController = new AbortController();
    // `IncomingMessage.close` also fires after a normal request body has been
    // consumed. Treat only an aborted request as a client disconnect; using
    // `close` here cancelled healthy streams before message.completed.
    request.raw.on('aborted', () => abortController.abort());
    await repo.addMessage({ conversationId, role: 'user', content: input.content, language, safetyResult: { decision: safety.decision, reasons: safety.reasons } });
    reply.hijack();
    reply.raw.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'x-request-id': request.correlationId });
    writeEvent(reply, 'message.started', { requestId: request.correlationId });
    if (safety.decision !== 'allow') {
      const text = safety.decision === 'emergency_referral'
        ? 'Please seek urgent emergency care now. If you are in immediate danger, contact local emergency services or a trusted person nearby.'
        : 'This topic needs private, qualified human support, so Hashie will not discuss it here. Please contact a licensed health professional or trusted support service.';
      writeEvent(reply, 'message.delta', { text });
      const [saved] = await repo.addMessage({ conversationId, role: 'assistant', content: text, language, policyVersion: safety.policyVersion, safetyResult: { decision: safety.decision, reasons: safety.reasons } });
      await repo.touch(conversationId);
      writeEvent(reply, 'message.completed', { messageId: saved?.id, persisted: Boolean(saved), safety: safety.decision });
      reply.raw.end();
      return;
    }
    const hits = await app.retriever.search({ query: input.content, language, limit: 5 });
    const history = normalizeProviderHistory([...existing.messages, { role: 'user' as const, content: input.content, language }].map(message => ({ role: message.role, content: message.content })));
    const system = buildHashieSystemPrompt({ language, ageGroup, region: profile?.region, accessibility: profile?.accessibility, voiceFirst: profile?.voiceFirst }, hits);
    let answer = '';
    let chunkCount = 0;
    try {
      for await (const chunk of app.intelligenceProvider.stream({ messages: [{ role: 'system', content: system }, ...history], language, ageGroup, signal: abortController.signal })) {
        chunkCount += 1;
        if (chunk.text) { answer += chunk.text; writeEvent(reply, 'message.delta', { text: chunk.text }); }
      }
      request.log.info({ streamAborted: abortController.signal.aborted, chunkCount, hasAnswer: Boolean(answer) }, 'chat stream provider finished');
      if (!abortController.signal.aborted && answer) {
        const [saved] = await repo.addMessage({ conversationId, role: 'assistant', content: answer, language, modelVersion: config.gatewayEnabled ? (language === 'tw' ? 'hashie-sunflower' : 'hashie-medgemma') : 'fake', policyVersion: `${safety.policyVersion}:${HASHIE_SYSTEM_PROMPT_VERSION}`, safetyResult: { decision: safety.decision, reasons: safety.reasons }, retrievedContentIds: hits.map(hit => hit.id) });
        await repo.touch(conversationId);
        writeEvent(reply, 'message.completed', { messageId: saved?.id, persisted: Boolean(saved) });
      } else if (!abortController.signal.aborted) {
        writeEvent(reply, 'message.error', { code: 'provider_unavailable', requestId: request.correlationId });
      }
    } catch (error) {
      request.log.warn({ streamAborted: abortController.signal.aborted, errorName: error instanceof Error ? error.name : 'unknown' }, 'chat stream provider failed');
      if (!abortController.signal.aborted) writeEvent(reply, 'message.error', { code: input.language === 'tw' ? 'akan_provider_unavailable' : 'provider_unavailable', message: input.language === 'tw' ? 'Akan/Twi support is temporarily unavailable. Please try again or continue in English.' : undefined, requestId: request.correlationId });
    } finally { reply.raw.end(); }
  });
}
