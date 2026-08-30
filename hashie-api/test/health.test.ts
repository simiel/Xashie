import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

describe('health routes', () => {
  let app: Awaited<ReturnType<typeof buildApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('reports process liveness without a database', async () => {
    app = await buildApp({ config: {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 4000,
      logLevel: 'silent',
      corsOrigins: [],
      databaseUrl: undefined,
      clerkSecretKey: undefined,
      clerkJwtKey: undefined,
      clerkAudience: undefined,
      clerkAuthorizedParties: [],
      gatewayUrl: 'http://localhost:9999/v1',
      gatewayToken: undefined,
      gatewayEnabled: false,
    } });

    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ service: 'hashie-api', status: 'ok' });
  });

  it('does not report readiness when the database is not configured', async () => {
    app = await buildApp({ config: {
      nodeEnv: 'test',
      host: '127.0.0.1',
      port: 4000,
      logLevel: 'silent',
      corsOrigins: [],
      databaseUrl: undefined,
      clerkSecretKey: undefined,
      clerkJwtKey: undefined,
      clerkAudience: undefined,
      clerkAuthorizedParties: [],
      gatewayUrl: 'http://localhost:9999/v1',
      gatewayToken: undefined,
      gatewayEnabled: false,
    } });

    const response = await app.inject({ method: 'GET', url: '/ready' });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ service: 'hashie-api', status: 'not_ready' });
  });
});
