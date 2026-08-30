import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGuestSession, clearPendingLanguage, profileKey, readGuestSession, readPendingLanguage, readProfile, writeGuestSession, writePendingLanguage, writeProfile } from './storage';
import { defaultProfile } from './types';

const { values } = vi.hoisted(() => ({ values: new Map<string, string>() }));
vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async (key: string) => values.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { values.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { values.delete(key); }),
}));

describe('Hashie onboarding storage', () => {
  beforeEach(() => values.clear());

  it('encodes namespaced profile owners into SecureStore-safe keys', () => {
    const key = profileKey('guest:guest_a');
    expect(key).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(key).not.toContain(':');
    expect(profileKey('account:user_a')).not.toBe(key);
  });

  it('persists language, age group, and accessibility preferences per account owner', async () => {
    await writeProfile('account:user_a', { ...defaultProfile, language: 'tw', ageGroup: '13_to_15', accessibility: { ...defaultProfile.accessibility, largeText: true } });
    const restored = await readProfile('account:user_a');
    expect(restored.language).toBe('tw');
    expect(restored.ageGroup).toBe('13_to_15');
    expect(restored.accessibility.largeText).toBe(true);
    expect((await readProfile('account:user_b')).language).toBe('en');
  });

  it('keeps guest identity separate and clears only guest data on exit', async () => {
    await writeGuestSession({ id: 'guest_a' });
    await writeProfile('guest:guest_a', { ...defaultProfile, completed: true });
    await writeProfile('account:user_a', { ...defaultProfile, language: 'tw' });
    await clearGuestSession();
    expect(await readGuestSession()).toBeNull();
    expect((await readProfile('guest:guest_a')).completed).toBe(false);
    expect((await readProfile('account:user_a')).language).toBe('tw');
  });

  it('preserves a pre-auth language preference until a session can claim it', async () => {
    await writePendingLanguage('tw');
    expect(await readPendingLanguage()).toBe('tw');
    await clearPendingLanguage();
    expect(await readPendingLanguage()).toBeNull();
  });
});
