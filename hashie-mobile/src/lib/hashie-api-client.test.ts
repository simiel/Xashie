import { describe, expect, it, vi } from 'vitest';

import { parseSse } from './hashie-api-client';

function streamOf(...chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index === chunks.length) controller.close();
      else controller.enqueue(encoder.encode(chunks[index++]));
    },
  });
}

describe('Hashie SSE client', () => {
  it('parses split frames and ignores the terminal DONE marker', async () => {
    const events: unknown[] = [];
    await parseSse(streamOf(
      'event: message.started\ndata: {"requestId":"r1"}\n\n',
      'event: message.delta\ndata: {"text":"Hel',
      'lo"}\n\n',
      'event: message.completed\ndata: {"messageId":"m1","persisted":true}\n\n',
      'data: [DONE]\n\n',
    ), event => events.push(event));
    expect(events).toEqual([
      { type: 'started', requestId: 'r1' },
      { type: 'delta', text: 'Hello' },
      { type: 'completed', messageId: 'm1', persisted: true, safety: undefined },
    ]);
  });

  it('stops parsing when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(parseSse(streamOf('event: message.delta\ndata: {"text":"x"}\n\n'), vi.fn(), controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
