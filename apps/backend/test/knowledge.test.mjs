import assert from 'node:assert/strict';
import test from 'node:test';
import { KnowledgeService, parseKnowledgeQuery } from '../dist/src/knowledge.js';

const vector = Array.from({ length: 1536 }, () => 0.01);

test('knowledge query validation bounds agent retrieval input', () => {
  assert.deepEqual(parseKnowledgeQuery({ query: 'puberty growth' }), { query: 'puberty growth', threshold: 0.72, limit: 5 });
  assert.throws(() => parseKnowledgeQuery({ query: 'x' }));
  assert.throws(() => parseKnowledgeQuery({ query: 'valid query', threshold: 1.1 }));
  assert.throws(() => parseKnowledgeQuery({ query: 'valid query', limit: 9 }));
});

test('knowledge service embeds only the bounded query and returns server-owned matches', async () => {
  const requested = [];
  const service = new KnowledgeService({ async match(embedding, threshold, limit) {
    requested.push({ embedding, threshold, limit });
    return [{ sourceId: 'a'.repeat(64), topic: 'Puberty Education', subtopic: 'Physical Changes', question: 'Why am I growing?', answer: 'Bodies grow during puberty.', similarity: 0.91 }];
  } }, { model: 'test', async embed(input) { assert.equal(input, 'puberty growth'); return vector; } });
  const matches = await service.retrieve({ query: ' puberty growth ', threshold: 0.8, limit: 3 });
  assert.equal(matches.length, 1);
  assert.equal(requested[0].embedding.length, 1536);
  assert.deepEqual({ threshold: requested[0].threshold, limit: requested[0].limit }, { threshold: 0.8, limit: 3 });
});
