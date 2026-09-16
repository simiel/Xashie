import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { handleRequest } from './app.js';

const port = Number(process.env.PORT ?? 3000);

const server = createServer(async (incoming, outgoing) => {
  try {
    const protocol = (incoming.headers['x-forwarded-proto'] ?? 'http').toString().split(',')[0];
    const host = incoming.headers.host ?? `localhost:${port}`;
    const method = incoming.method ?? 'GET';
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
