import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { handleRequest } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const defaultWebOrigins = ['https://hashie.abrantepa.com'];
const allowedWebOrigins = new Set((process.env.HASHIE_WEB_ALLOWED_ORIGINS ?? defaultWebOrigins.join(','))
  .split(',')
  .map((value) => value.trim())
  .filter((value) => {
    try {
      const origin = new URL(value).origin;
      return origin === value && (origin.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin));
    } catch {
      return false;
    }
  }));

function allowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  try {
    const normalized = new URL(origin).origin;
    return allowedWebOrigins.has(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function setCorsHeaders(headers: { setHeader(name: string, value: string): void }, origin: string): void {
  headers.setHeader('access-control-allow-origin', origin);
  headers.setHeader('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  headers.setHeader('access-control-allow-headers', 'authorization, content-type, idempotency-key, x-hashie-guest-token');
  headers.setHeader('access-control-max-age', '86400');
  headers.setHeader('vary', 'Origin');
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const protocol = (incoming.headers['x-forwarded-proto'] ?? 'http').toString().split(',')[0];
    const host = incoming.headers.host ?? `localhost:${port}`;
    const method = incoming.method ?? 'GET';
    const origin = allowedOrigin(incoming.headers.origin);
    if (method === 'OPTIONS' && incoming.headers.origin) {
      if (!origin) {
        outgoing.statusCode = 403;
        outgoing.end();
        return;
      }
      outgoing.statusCode = 204;
      setCorsHeaders(outgoing, origin);
      outgoing.end();
      return;
    }
    const body = method === 'GET' || method === 'HEAD' ? undefined : Readable.toWeb(incoming) as unknown as BodyInit;
    const request = new Request(`${protocol}://${host}${incoming.url ?? '/'}`, {
      method,
      headers: incoming.headers as Record<string, string>,
      body,
      ...(body ? { duplex: 'half' as const } : {}),
    } as RequestInit & { duplex?: 'half' });
    const response = await handleRequest(request);
    outgoing.statusCode = response.status;
    response.headers.forEach((value, key) => outgoing.setHeader(key, value));
    if (origin) setCorsHeaders(outgoing, origin);
    if (!response.body) {
      outgoing.end();
      return;
    }
    const stream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
    stream.on('error', () => {
      if (!outgoing.headersSent) {
        outgoing.statusCode = 502;
        outgoing.setHeader('content-type', 'application/json; charset=utf-8');
      }
      outgoing.end();
    });
    stream.pipe(outgoing);
  } catch {
    outgoing.statusCode = 500;
    outgoing.setHeader('content-type', 'application/json; charset=utf-8');
    outgoing.end(JSON.stringify({ error: { code: 'service_unavailable', message: 'The request could not be completed.' } }));
  }
});

server.listen(port, () => {
  console.log(`Hashie backend listening on port ${port}`);
});
