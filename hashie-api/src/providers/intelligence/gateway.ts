import type { IntelligenceChunk, IntelligenceProvider, IntelligenceRequest } from './types.js';

const gatewayLanguage: Record<IntelligenceRequest['language'], string> = { en: 'eng', tw: 'akh' };

export type GatewayOptions = {
  baseUrl: string;
  token: string;
  model?: string;
  timeoutMs?: number;
  akanTimeoutMs?: number;
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
};

export class ProviderError extends Error {
  constructor(public readonly status: number | undefined, message = 'The intelligence provider is unavailable.') { super(message); this.name = 'ProviderError'; }
}

export class GatewayIntelligenceProvider implements IntelligenceProvider {
  constructor(private readonly options: GatewayOptions) {}

  async *stream(request: IntelligenceRequest): AsyncIterable<IntelligenceChunk> {
    const maxRetries = this.options.maxRetries ?? 2;
    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), request.language === 'tw' ? (this.options.akanTimeoutMs ?? 30_000) : (this.options.timeoutMs ?? 15_000));
      const abort = () => controller.abort(request.signal?.reason);
      request.signal?.addEventListener('abort', abort, { once: true });
      try {
        const response = await fetch(`${this.options.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.options.token}`,
        'content-type': 'application/json',
        accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model: this.options.model ?? 'hashie-medgemma',
        messages: request.messages,
        language: gatewayLanguage[request.language],
        country: 'Ghana',
        store: false,
        stream: true,
      }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            await (this.options.sleep ?? ((ms: number) => new Promise(resolve => setTimeout(resolve, ms))))(250 * 2 ** attempt);
            continue;
          }
          throw new ProviderError(response.status);
        }

        yield* parseGatewayStream(response.body);
        return;
      } catch (error) {
        if (request.signal?.aborted) throw error;
        if (error instanceof ProviderError) throw error;
        if (attempt >= maxRetries) throw new ProviderError(undefined);
        await (this.options.sleep ?? ((ms: number) => new Promise(resolve => setTimeout(resolve, ms))))(250 * 2 ** attempt);
      } finally {
        clearTimeout(timeout);
        request.signal?.removeEventListener('abort', abort);
      }
    }
  }
}

async function* parseGatewayStream(body: ReadableStream<Uint8Array>): AsyncIterable<IntelligenceChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replaceAll('\r\n', '\n');
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const data = event.split('\n').find(line => line.startsWith('data:'))?.slice(5).trim();
      if (!data) continue;
      if (data === '[DONE]') return;
      const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null }> };
      const choice = parsed.choices?.[0];
      if (!choice) continue;
      const chunk: IntelligenceChunk = { text: choice.delta?.content ?? '' };
      if (choice.finish_reason) chunk.finishReason = choice.finish_reason;
      yield chunk;
    }

    if (done) return;
  }
}
