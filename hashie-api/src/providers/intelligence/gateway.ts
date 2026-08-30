import type { IntelligenceChunk, IntelligenceProvider, IntelligenceRequest } from './types.js';

const gatewayLanguage: Record<IntelligenceRequest['language'], string> = { en: 'eng', tw: 'akh' };

export type GatewayOptions = {
  baseUrl: string;
  token: string;
  model?: string;
};

export class GatewayIntelligenceProvider implements IntelligenceProvider {
  constructor(private readonly options: GatewayOptions) {}

  async *stream(request: IntelligenceRequest): AsyncIterable<IntelligenceChunk> {
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
      ...(request.signal ? { signal: request.signal } : {}),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Intelligence provider request failed with status ${response.status}.`);
    }

    yield* parseGatewayStream(response.body);
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
