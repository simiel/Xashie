import assert from 'node:assert/strict';
import test from 'node:test';
import { SupabaseDataStore } from '../dist/src/store.js';

function withFetch(handler) {
  const previous = globalThis.fetch;
  globalThis.fetch = handler;
  return () => { globalThis.fetch = previous; };
}

test('Supabase guest upgrade calls the server-only transactional RPC and maps its result', async () => {
  let request;
  const restore = withFetch(async (input, init) => {
    request = { url: String(input), init };
    return new Response(JSON.stringify({ status: 'ok', already_upgraded: false, migrated_preferences: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });

  try {
    const store = new SupabaseDataStore({ url: 'https://hashie.example', serviceRoleKey: 'test-only-server-value' });
    const result = await store.upgradeGuestSession(
      '00000000-0000-0000-0000-000000000001',
      'user_test_123',
      'a'.repeat(64),
      '2026-09-16T12:00:00.000Z',
    );
    assert.deepEqual(result, { alreadyUpgraded: false, migratedPreferences: true });
    assert.equal(request.url, 'https://hashie.example/rest/v1/rpc/hashie_upgrade_guest_session');
    assert.deepEqual(JSON.parse(request.init.body), {
      p_session_id: '00000000-0000-0000-0000-000000000001',
      p_clerk_user_id: 'user_test_123',
      p_idempotency_key_hash: 'a'.repeat(64),
      p_consent: true,
      p_now: '2026-09-16T12:00:00.000Z',
    });
  } finally {
    restore();
  }
});

test('Supabase guest upgrade preserves inactive and conflict classifications', async () => {
  const store = new SupabaseDataStore({ url: 'https://hashie.example', serviceRoleKey: 'test-only-server-value' });
  const restore = withFetch(async (_input, init) => {
    const body = JSON.parse(init.body);
    const status = body.p_clerk_user_id === 'user_inactive' ? 'inactive' : 'conflict';
    return new Response(JSON.stringify({ status }), { status: 200 });
  });

  try {
    await assert.rejects(
      store.upgradeGuestSession('00000000-0000-0000-0000-000000000001', 'user_inactive', 'a'.repeat(64), '2026-09-16T12:00:00.000Z'),
      (error) => error?.code === 'inactive',
    );
    await assert.rejects(
      store.upgradeGuestSession('00000000-0000-0000-0000-000000000001', 'user_conflict', 'a'.repeat(64), '2026-09-16T12:00:00.000Z'),
      (error) => error?.code === 'conflict',
    );
  } finally {
    restore();
  }
});
