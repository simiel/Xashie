const assert = require('node:assert/strict');
const test = require('node:test');
const { compactAgentHistory } = require('../.test-build/agent-history.js');

test('history compaction preserves recent context while bounding individual and total size', () => {
  const history = compactAgentHistory([
    { role: 'user', content: 'old question' },
    { role: 'assistant', content: 'a'.repeat(2_000) },
    { role: 'user', content: 'b'.repeat(2_000) },
    { role: 'assistant', content: 'c'.repeat(2_000) },
  ]);

  assert.ok(history.length <= 8);
  assert.ok(history.every((item) => item.content.length <= 1_200));
  assert.ok(history.reduce((total, item) => total + item.content.length, 0) <= 4_800);
  assert.equal(history.at(-1).content, 'c'.repeat(1_200));
});

test('history compaction leaves the newest short turns unchanged', () => {
  const history = compactAgentHistory([
    { role: 'user', content: 'What is puberty?' },
    { role: 'assistant', content: 'It is a normal stage of development.' },
  ]);
  assert.deepEqual(history, [
    { role: 'user', content: 'What is puberty?' },
    { role: 'assistant', content: 'It is a normal stage of development.' },
  ]);
});
