export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: string;
  corsOrigins: string[];
  databaseUrl: string | undefined;
  clerkSecretKey: string | undefined;
  clerkJwtKey: string | undefined;
  clerkAudience: string | undefined;
  clerkAuthorizedParties: string[];
  gatewayUrl: string;
  gatewayToken: string | undefined;
  gatewayEnabled: boolean;
};

function optional(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function list(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (nodeEnv !== 'development' && nodeEnv !== 'test' && nodeEnv !== 'production') {
    throw new Error(`Unsupported NODE_ENV: ${nodeEnv}`);
  }

  const port = Number(env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return {
    nodeEnv,
    host: env.HOST ?? '127.0.0.1',
    port,
    logLevel: env.LOG_LEVEL ?? 'info',
    corsOrigins: list(env.CORS_ORIGINS),
    databaseUrl: optional(env.DATABASE_URL),
    clerkSecretKey: optional(env.CLERK_SECRET_KEY),
    clerkJwtKey: optional(env.CLERK_JWT_KEY),
    clerkAudience: optional(env.CLERK_AUDIENCE),
    clerkAuthorizedParties: list(env.CLERK_AUTHORIZED_PARTIES),
    gatewayUrl: env.HASHIE_GATEWAY_URL ?? 'https://hashie-llm-openai-gateway-5bq6okiwgq-ew.a.run.app/v1',
    gatewayToken: optional(env.HASHIE_GATEWAY_TOKEN),
    gatewayEnabled: env.HASHIE_GATEWAY_ENABLED === 'true',
  };
}
