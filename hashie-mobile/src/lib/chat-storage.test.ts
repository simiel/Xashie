import { beforeEach, describe, expect, it, vi } from 'vitest';

import { boundedMessages, chatStorageKey, readChatHistory, writeChatHistory } from './chat-storage';
import { createChatMessage } from './chat-state';

const { values } = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { values.delete(key); }),
}));

describe('chat storage', () => {
  beforeEach(() => values.clear());

  it('uses SecureStore-safe, owner-specific keys and bounds persisted messages', async () => {
    const messages = Array.from({ length: 20 }, (_, index) => [
      createChatMessage('user', `${index}-question`, 'en', 'complete', false),
      createChatMessage('assistant', `${index}-${'x'.repeat(2200)}`, 'en', 'complete', true),
    ]).flat();
    await writeChatHistory('account:user_a', messages);
    const restored = await readChatHistory('account:user_a');
    expect(chatStorageKey('account:user_a')).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(chatStorageKey('account:user_a')).not.toBe(chatStorageKey('account:user_b'));
    expect(restored).toHaveLength(16);
    expect(Math.max(...restored.map(message => message.text.length))).toBe(1800);
  });

  it('falls back to an empty history when stored JSON is corrupted', async () => {
    values.set(chatStorageKey('account:user_a'), '{not valid json');
    await expect(readChatHistory('account:user_a')).resolves.toEqual([]);
  });

  it('does not persist in-progress, failed, or empty messages', () => {
    const complete = createChatMessage('assistant', 'done', 'en', 'complete', true);
    const failed = createChatMessage('assistant', 'failed', 'en', 'failed', true);
    const empty = createChatMessage('assistant', '', 'en', 'complete', true);
    expect(boundedMessages([complete, failed, empty])).toEqual([complete]);
  });
});
