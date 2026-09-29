import assert from 'node:assert/strict';
import test from 'node:test';
import { createApp } from '../dist/src/app.js';
import { InMemoryDataStore, UnavailableDataStore } from '../dist/src/store.js';
import { MemoryRateLimiter } from '../dist/src/rate-limit.js';
import { guestSessionTtlMs } from '../dist/src/security.js';

class FakeClerkVerifier {
  async verifyBearerToken(token) {
    if (token === 'clerk-token') return { status: 'authenticated', identity: { userId: 'user_123', sessionId: 'sess_123' } };
    if (token === 'other-clerk-token') return { status: 'authenticated', identity: { userId: 'user_456', sessionId: 'sess_456' } };
    return { status: 'invalid' };
  }
}

function setup() {
  let current = new Date('2026-09-16T12:00:00.000Z');
  const store = new InMemoryDataStore();
  const app = createApp({ store, clerk: new FakeClerkVerifier(), rateLimiter: new MemoryRateLimiter(), now: () => current });
  return { app, store, advance(ms) { current = new Date(current.getTime() + ms); } };
}

async function call(app, path, init = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await app(new Request(`https://api.test${path}`, { ...init, headers }));
  const body = await response.json();
  return { response, body };
}

test('health endpoint returns a stable service response', async () => {
  const { app } = setup();
  const { response, body } = await call(app, '/healthz');
  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true, service: 'hashie-backend', version: 'v1' });
});

test('guest sessions issue opaque tokens and own preferences', async () => {
  const { app } = setup();
  const created = await call(app, '/v1/guest-sessions', { method: 'POST' });
  assert.equal(created.response.status, 201);
  assert.match(created.body.token, /^ghs_[A-Za-z0-9_-]+$/);
  const token = created.body.token;
  const updated = await call(app, '/v1/me/preferences', {
    method: 'PATCH', headers: { 'x-hashie-guest-token': token },
    body: JSON.stringify({ language: 'akan-twi', ageGroup: '16-17', nickname: 'Ama' }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.preferences.nickname, 'Ama');
  const read = await call(app, '/v1/me/preferences', { headers: { 'x-hashie-guest-token': token } });
  assert.deepEqual(read.body.preferences, { language: 'akan-twi', nickname: 'Ama', ageGroup: '16-17', accessibilityPreferences: [], updatedAt: '2026-09-16T12:00:00.000Z' });
});

test('optional age group can be skipped or explicitly cleared without changing omitted fields', async () => {
  const { app } = setup();
  const created = await call(app, '/v1/guest-sessions', { method: 'POST' });
  const token = created.body.token;
  const skipped = await call(app, '/v1/me/preferences', {
    method: 'PATCH', headers: { 'x-hashie-guest-token': token },
    body: JSON.stringify({ language: 'english', nickname: null, ageGroup: null, accessibilityPreferences: ['captions'] }),
  });
  assert.equal(skipped.response.status, 200);
  assert.equal(skipped.body.preferences.ageGroup, null);
  assert.deepEqual(skipped.body.preferences.accessibilityPreferences, ['captions']);

  const selected = await call(app, '/v1/me/preferences', {
    method: 'PATCH', headers: { 'x-hashie-guest-token': token },
    body: JSON.stringify({ ageGroup: '18-24' }),
  });
  assert.equal(selected.response.status, 200);
  assert.equal(selected.body.preferences.ageGroup, '18-24');
  assert.deepEqual(selected.body.preferences.accessibilityPreferences, ['captions']);

  const cleared = await call(app, '/v1/me/preferences', {
    method: 'PATCH', headers: { 'x-hashie-guest-token': token },
    body: JSON.stringify({ ageGroup: null }),
  });
  assert.equal(cleared.response.status, 200);
  assert.equal(cleared.body.preferences.ageGroup, null);
  assert.deepEqual(cleared.body.preferences.accessibilityPreferences, ['captions']);
});

test('credential conflicts and invalid preference fields are rejected', async () => {
  const { app } = setup();
  const created = await call(app, '/v1/guest-sessions', { method: 'POST' });
  const invalid = await call(app, '/v1/me/preferences', {
    method: 'PATCH', headers: { 'x-hashie-guest-token': created.body.token }, body: JSON.stringify({ ownerId: 'attacker' }),
  });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.body.error.code, 'validation_error');
  const conflict = await call(app, '/v1/session', { headers: { 'x-hashie-guest-token': created.body.token, authorization: 'Bearer clerk-token' } });
  assert.equal(conflict.response.status, 400);
  assert.equal(conflict.body.error.code, 'conflicting_credentials');
});

test('Clerk credentials resolve to server-owned preferences', async () => {
  const { app } = setup();
  const session = await call(app, '/v1/session', { headers: { authorization: 'Bearer clerk-token' } });
  assert.equal(session.response.status, 200);
  assert.equal(session.body.actor.userId, 'user_123');
  const updated = await call(app, '/v1/me/preferences', {
    method: 'PATCH', headers: { authorization: 'Bearer clerk-token' }, body: JSON.stringify({ language: 'english', accessibilityPreferences: ['captions'] }),
  });
  assert.equal(updated.response.status, 200);
  assert.deepEqual(updated.body.preferences.accessibilityPreferences, ['captions']);
});

test('expired guests cannot access protected routes', async () => {
  const { app, advance } = setup();
  const created = await call(app, '/v1/guest-sessions', { method: 'POST' });
  advance(guestSessionTtlMs + 1);
  const session = await call(app, '/v1/session', { headers: { 'x-hashie-guest-token': created.body.token } });
  assert.equal(session.response.status, 401);
  assert.equal(session.body.error.code, 'invalid_credentials');
});

test('invalid Clerk credentials log only a safe rejection diagnostic correlated to the response request ID', async () => {
  const diagnostic = { outcome: 'not_authenticated', issuer: 'https://clerk.hashie.abrantepa.com', authorizedParty: 'https://clerk.hashie.abrantepa.com', keyId: 'kid_safe', configuredAuthorizedParties: ['https://clerk.hashie.abrantepa.com'] };
  const messages = [];
  const app = createApp({
    store: new InMemoryDataStore(),
    clerk: { async verifyBearerToken() { return { status: 'invalid', diagnostic }; } },
    rateLimiter: new MemoryRateLimiter(),
    requestId: () => 'req_clerk_diagnostic',
  });
  const originalWarn = console.warn;
  console.warn = (...args) => messages.push(args);
  try {
    const { response, body } = await call(app, '/v1/session', { headers: { authorization: 'Bearer never-log-this-token' } });
    assert.equal(response.status, 401);
    assert.equal(body.error.code, 'invalid_credentials');
    assert.equal(response.headers.get('x-request-id'), 'req_clerk_diagnostic');
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(messages, [['[Hashie auth] Clerk token rejected', { requestId: 'req_clerk_diagnostic', ...diagnostic }]]);
  assert.doesNotMatch(JSON.stringify(messages), /never-log-this-token/);
});

test('agent stream requires an actor and passes only validated input to the server-owned agent', async () => {
  let received = null;
  const store = new InMemoryDataStore();
  const app = createApp({
    store, clerk: new FakeClerkVerifier(), rateLimiter: new MemoryRateLimiter(),
    agent: { async stream(input) { received = input; return new Response('grounded reply', { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } }); } },
  });
  const created = await call(app, '/v1/guest-sessions', { method: 'POST' });
  const response = await app(new Request('https://api.test/v1/agent/stream', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-hashie-guest-token': created.body.token }, body: JSON.stringify({ message: 'What is puberty?' }),
  }));
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'grounded reply');
  assert.equal(received.message, 'What is puberty?');
  assert.equal(received.actor.type, 'guest');
  assert.deepEqual(received.userContext, { name: 'Not provided', ageGroup: 'Not provided', preferredLanguage: 'Not provided', accessibilityPreferences: [], sessionType: 'guest' });
  const rejected = await call(app, '/v1/agent/stream', { method: 'POST', body: JSON.stringify({ message: 'x' }) });
  assert.equal(rejected.response.status, 401);
});

test('guest and Clerk agent requests get the same server-owned preference context', async () => {
  const calls = [];
  const store = new InMemoryDataStore();
  const app = createApp({ store, clerk: new FakeClerkVerifier(), rateLimiter: new MemoryRateLimiter(), agent: { async stream(input) { calls.push(input); return new Response('ok'); } } });
  const guest = await call(app, '/v1/guest-sessions', { method: 'POST' });
  await call(app, '/v1/me/preferences', { method: 'PATCH', headers: { 'x-hashie-guest-token': guest.body.token }, body: JSON.stringify({ nickname: 'Ama', ageGroup: '13-15', language: 'english', accessibilityPreferences: ['visual-details'] }) });
  await call(app, '/v1/me/preferences', { method: 'PATCH', headers: { authorization: 'Bearer clerk-token' }, body: JSON.stringify({ nickname: 'Kojo', ageGroup: '18-24', language: 'english', accessibilityPreferences: ['captions'] }) });
  await app(new Request('https://api.test/v1/agent/stream', { method: 'POST', headers: { 'content-type': 'application/json', 'x-hashie-guest-token': guest.body.token }, body: JSON.stringify({ message: 'What is puberty?' }) }));
  await app(new Request('https://api.test/v1/agent/stream', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer clerk-token' }, body: JSON.stringify({ message: 'What is puberty?' }) }));
  assert.deepEqual(calls.map((call) => call.userContext), [
    { name: 'Ama', ageGroup: '13-15', preferredLanguage: 'english', accessibilityPreferences: ['visual-details'], sessionType: 'guest' },
    { name: 'Kojo', ageGroup: '18-24', preferredLanguage: 'english', accessibilityPreferences: ['captions'], sessionType: 'signed-in' },
  ]);
});

test('guest upgrade requires consent, migrates once, and is idempotent', async () => {
  const { app } = setup();
  const created = await call(app, '/v1/guest-sessions', { method: 'POST' });
  const token = created.body.token;
  await call(app, '/v1/me/preferences', { method: 'PATCH', headers: { 'x-hashie-guest-token': token }, body: JSON.stringify({ nickname: 'Kofi', ageGroup: '18-24' }) });
  const headers = { 'x-hashie-guest-token': token, authorization: 'Bearer clerk-token', 'idempotency-key': 'upgrade-key-1' };
  const upgraded = await call(app, '/v1/guest-sessions/upgrade', { method: 'POST', headers, body: JSON.stringify({ consent: true }) });
  assert.equal(upgraded.response.status, 200);
  assert.equal(upgraded.body.migratedPreferences, true);
  const clerkPrefs = await call(app, '/v1/me/preferences', { headers: { authorization: 'Bearer clerk-token' } });
  assert.equal(clerkPrefs.body.preferences.nickname, 'Kofi');
  const repeated = await call(app, '/v1/guest-sessions/upgrade', { method: 'POST', headers, body: JSON.stringify({ consent: true }) });
  assert.equal(repeated.response.status, 200);
  assert.equal(repeated.body.alreadyUpgraded, true);
  const conflictingReplay = await call(app, '/v1/guest-sessions/upgrade', {
    method: 'POST', headers: { ...headers, 'idempotency-key': 'different-key-2' }, body: JSON.stringify({ consent: true }),
  });
  assert.equal(conflictingReplay.response.status, 409);
  const repeatWithClerkOnly = await call(app, '/v1/me/preferences', { headers: { authorization: 'Bearer clerk-token' } });
  assert.equal(repeatWithClerkOnly.response.status, 200);
});

test('guest upgrade uses the production merge contract when account preferences already exist', async () => {
  const { app } = setup();
  const created = await call(app, '/v1/guest-sessions', { method: 'POST' });
  const token = created.body.token;
  await call(app, '/v1/me/preferences', {
    method: 'PATCH',
    headers: { 'x-hashie-guest-token': token },
    body: JSON.stringify({ language: 'akan-twi', nickname: 'Ama', ageGroup: '16-17', accessibilityPreferences: ['captions', 'visual-details'] }),
  });
  await call(app, '/v1/me/preferences', {
    method: 'PATCH',
    headers: { authorization: 'Bearer clerk-token' },
    body: JSON.stringify({ language: 'english', nickname: null, ageGroup: '18-24', accessibilityPreferences: ['larger-text', 'captions'] }),
  });
  const headers = { 'x-hashie-guest-token': token, authorization: 'Bearer clerk-token', 'idempotency-key': 'upgrade-merge-key' };
  const upgraded = await call(app, '/v1/guest-sessions/upgrade', { method: 'POST', headers, body: JSON.stringify({ consent: true }) });
  assert.equal(upgraded.response.status, 200);
  assert.equal(upgraded.body.migratedPreferences, true);
  const preferences = await call(app, '/v1/me/preferences', { headers: { authorization: 'Bearer clerk-token' } });
  assert.deepEqual(preferences.body.preferences, {
    language: 'english',
    nickname: 'Ama',
    ageGroup: '18-24',
    accessibilityPreferences: ['larger-text', 'captions', 'visual-details'],
    updatedAt: '2026-09-16T12:00:00.000Z',
  });
  const repeated = await call(app, '/v1/guest-sessions/upgrade', { method: 'POST', headers, body: JSON.stringify({ consent: true }) });
  assert.equal(repeated.response.status, 200);
  assert.equal(repeated.body.alreadyUpgraded, true);
  assert.equal(repeated.body.migratedPreferences, false);
});

test('delete is scoped to the authenticated owner', async () => {
  const { app } = setup();
  const first = await call(app, '/v1/guest-sessions', { method: 'POST' });
  const second = await call(app, '/v1/guest-sessions', { method: 'POST' });
  await call(app, '/v1/me/preferences', { method: 'PATCH', headers: { 'x-hashie-guest-token': first.body.token }, body: JSON.stringify({ nickname: 'Esi' }) });
  await call(app, '/v1/me/preferences', { method: 'DELETE', headers: { 'x-hashie-guest-token': second.body.token } });
  const stillThere = await call(app, '/v1/me/preferences', { headers: { 'x-hashie-guest-token': first.body.token } });
  assert.equal(stillThere.body.preferences.nickname, 'Esi');
  const deleted = await call(app, '/v1/me/preferences', { method: 'DELETE', headers: { 'x-hashie-guest-token': first.body.token } });
  assert.equal(deleted.body.deleted, true);
});

test('missing persistence fails closed', async () => {
  const app = createApp({ store: new UnavailableDataStore(), clerk: new FakeClerkVerifier(), rateLimiter: new MemoryRateLimiter() });
  const result = await call(app, '/v1/guest-sessions', { method: 'POST' });
  assert.equal(result.response.status, 503);
  assert.equal(result.body.error.code, 'service_not_configured');
  assert.equal('token' in result.body, false);
});
