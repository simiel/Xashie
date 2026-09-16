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
