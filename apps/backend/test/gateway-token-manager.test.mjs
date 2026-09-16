import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { GatewayTokenManager } from '../dist/src/gateway-token-manager.js';

test('refreshes and persists one rotated pair for concurrent callers', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hashie-gateway-test-'));
  let calls = 0;
  const manager = new GatewayTokenManager({
    baseUrl: 'https://gateway.test', accessToken: 'not-a-jwt', refreshToken: 'initial-refresh', tokenFile: join(directory, 'tokens.json'),
    fetcher: async () => {
      calls += 1;
      return Response.json({ access_token: 'access-two', refresh_token: 'refresh-two', expires_at: '2030-01-01T00:00:00.000Z' });
    },
    now: () => new Date('2026-01-01T00:00:00.000Z'),
  });
  assert.deepEqual(await Promise.all([manager.getAccessToken(), manager.getAccessToken(), manager.getAccessToken()]), ['access-two', 'access-two', 'access-two']);
  assert.equal(calls, 1);
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'tokens.json'), 'utf8')), { accessToken: 'access-two', refreshToken: 'refresh-two', expiresAt: '2030-01-01T00:00:00.000Z' });
});
