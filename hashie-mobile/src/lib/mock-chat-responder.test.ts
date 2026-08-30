import { describe, expect, it } from 'vitest';

import { MOCK_FAILURE_TOKEN, MockResponderCancelledError, MockResponderError, getMockResponse, streamMockResponse } from './mock-chat-responder';

describe('local mock chat responder', () => {
  it('selects predictable categories and keeps the English response bounded', () => {
    const response = getMockResponse({ text: 'What are common signs of stress?', language: 'en', ageGroup: '18_plus' });
    expect(response.category).toBe('mental_wellbeing');
    expect(response.text).toContain('local mock response');
    expect(response.text).toContain('qualified health professional');
  });

  it('uses the provided Akan/Twi safe response when Twi is selected', () => {
    const response = getMockResponse({ text: 'Mepɛ mmoa', language: 'tw', ageGroup: 'unknown' });
    expect(response.category).toBe('akan');
    expect(response.text).toContain('Metumi aboa wo');
    expect(response.text).toContain('mock mmuae');
  });

  it('reveals a response progressively in deterministic chunks', async () => {
    const chunks: string[] = [];
    const response = await streamMockResponse(
      { text: 'Hello Hashie', language: 'en', ageGroup: 'unknown' },
      { latencyMs: 0, chunkDelayMs: 0, onChunk: chunk => chunks.push(chunk) },
    );
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.at(-1)).toBe(response.text);
  });

  it('supports cancellation and a deterministic failure trigger', async () => {
    const controller = new AbortController();
    const cancelled = streamMockResponse(
      { text: 'Hello', language: 'en', ageGroup: 'unknown' },
      { latencyMs: 0, chunkDelayMs: 0, onChunk: () => controller.abort(), signal: controller.signal },
    );
    await expect(cancelled).rejects.toBeInstanceOf(MockResponderCancelledError);
    await expect(streamMockResponse({ text: MOCK_FAILURE_TOKEN, language: 'en', ageGroup: 'unknown' })).rejects.toBeInstanceOf(MockResponderError);
  });
});
