import type { IntelligenceProvider, IntelligenceRequest } from './types.js';

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }, { once: true });
  });
}

export class FakeIntelligenceProvider implements IntelligenceProvider {
  constructor(private readonly chunkDelayMs = 0) {}

  async *stream(request: IntelligenceRequest) {
    const input = request.messages.at(-1)?.content ?? '';
    const response = `Local provider response for ${request.language}: ${input}`;
    for (const text of response.match(/.{1,24}/g) ?? []) {
      await wait(this.chunkDelayMs, request.signal);
      yield { text };
    }
    yield { text: '', finishReason: 'stop' };
  }
}
