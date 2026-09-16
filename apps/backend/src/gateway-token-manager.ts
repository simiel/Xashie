import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

export type GatewayTokenPair = { accessToken: string; refreshToken: string; expiresAt: string };
export type GatewayFetch = typeof fetch;

export class GatewayAuthError extends Error {
  constructor() { super('The language model gateway is temporarily unavailable.'); this.name = 'GatewayAuthError'; }
}

type TokenManagerOptions = {
  baseUrl: string;
  accessToken: string;
  refreshToken: string;
  tokenFile?: string;
  fetcher?: GatewayFetch;
  now?: () => Date;
  refreshSkewMs?: number;
};

export class GatewayTokenManager {
  private readonly baseUrl: string;
  private readonly tokenFile: string;
  private readonly fetcher: GatewayFetch;
  private readonly now: () => Date;
  private readonly refreshSkewMs: number;
  private pair: GatewayTokenPair;
  private refreshPromise: Promise<GatewayTokenPair> | null = null;
  private loaded = false;

  constructor(options: TokenManagerOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.tokenFile = options.tokenFile ?? resolve(process.cwd(), '.hashie-gateway-tokens.local.json');
    this.fetcher = options.fetcher ?? fetch;
    this.now = options.now ?? (() => new Date());
    this.refreshSkewMs = options.refreshSkewMs ?? 10 * 60_000;
    this.pair = { accessToken: options.accessToken, refreshToken: options.refreshToken, expiresAt: expiryFromJwt(options.accessToken) ?? new Date(0).toISOString() };
  }

  async getAccessToken(): Promise<string> {
    await this.loadPersistedPair();
    if (this.isFresh(this.pair)) return this.pair.accessToken;
    return (await this.refresh()).accessToken;
  }

  getBaseUrl(): string { return this.baseUrl; }

  private async loadPersistedPair(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const value: unknown = JSON.parse(await readFile(this.tokenFile, 'utf8'));
      if (isTokenPair(value)) this.pair = value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new GatewayAuthError();
    }
  }

  private async refresh(): Promise<GatewayTokenPair> {
    if (!this.refreshPromise) this.refreshPromise = this.refreshOnce().finally(() => { this.refreshPromise = null; });
    return this.refreshPromise;
  }

  private async refreshOnce(): Promise<GatewayTokenPair> {
    let response: Response;
    try {
      response = await this.fetcher(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.pair.refreshToken }),
      });
    } catch { throw new GatewayAuthError(); }
    if (!response.ok) throw new GatewayAuthError();
    let value: unknown;
    try { value = await response.json(); } catch { throw new GatewayAuthError(); }
    const pair = parseRefreshResponse(value);
    if (!pair) throw new GatewayAuthError();
    await this.persist(pair);
    this.pair = pair;
    return pair;
  }

  private async persist(pair: GatewayTokenPair): Promise<void> {
    const directory = dirname(this.tokenFile);
    const temporary = `${this.tokenFile}.${process.pid}.tmp`;
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(temporary, JSON.stringify(pair), { mode: 0o600 });
      await chmod(temporary, 0o600);
      await rename(temporary, this.tokenFile);
      await chmod(this.tokenFile, 0o600);
    } catch { throw new GatewayAuthError(); }
  }

  private isFresh(pair: GatewayTokenPair): boolean {
    const expiresAt = Date.parse(pair.expiresAt);
    return Number.isFinite(expiresAt) && expiresAt - this.now().getTime() > this.refreshSkewMs;
  }
}

export function createGatewayTokenManagerFromEnv(env: NodeJS.ProcessEnv = process.env): GatewayTokenManager | null {
  if (!env.MEDGEMMA_BASE_URL || !env.MEDGEMMA_ACCESS_KEY || !env.MEDGEMMA_REFRESH_KEY) return null;
  return new GatewayTokenManager({ baseUrl: env.MEDGEMMA_BASE_URL, accessToken: env.MEDGEMMA_ACCESS_KEY, refreshToken: env.MEDGEMMA_REFRESH_KEY, tokenFile: env.HASHIE_GATEWAY_TOKEN_FILE });
}

function expiryFromJwt(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const value: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const exp = (value as { exp?: unknown })?.exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? new Date(exp * 1_000).toISOString() : null;
  } catch { return null; }
}

function isTokenPair(value: unknown): value is GatewayTokenPair {
  if (typeof value !== 'object' || value === null) return false;
  const pair = value as Partial<GatewayTokenPair>;
  return typeof pair.accessToken === 'string' && pair.accessToken.length > 0
    && typeof pair.refreshToken === 'string' && pair.refreshToken.length > 0
    && typeof pair.expiresAt === 'string' && Number.isFinite(Date.parse(pair.expiresAt));
}

function parseRefreshResponse(value: unknown): GatewayTokenPair | null {
  if (typeof value !== 'object' || value === null) return null;
  const response = value as { access_token?: unknown; refresh_token?: unknown; expires_at?: unknown };
  const pair = { accessToken: response.access_token, refreshToken: response.refresh_token, expiresAt: response.expires_at };
  return isTokenPair(pair) ? pair : null;
}
