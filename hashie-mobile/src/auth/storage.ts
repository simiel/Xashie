import * as SecureStore from 'expo-secure-store';

import { defaultProfile, type OnboardingProfile } from './types';
import type { SupportedLanguage } from '@/content/copy';

const guestSessionKey = 'hashie.mobile.guest-session.v1';
const pendingLanguageKey = 'hashie.mobile.pending-language.v1';

// SecureStore only permits alphanumeric characters plus `.`, `-`, and `_` in
// keys. Hashie's logical owners deliberately contain a namespace separator
// (`account:<Clerk user id>` or `guest:<guest id>`), so encode the entire owner
// deterministically instead of placing it directly in the SecureStore key.
// Encoding every UTF-16 code unit keeps the mapping reversible and collision
// free without exposing the Clerk user ID in the storage key.
export const profileKey = (owner: string) => {
  const encodedOwner = owner.split('').map(character => character.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  return `hashie.mobile.onboarding.owner-${encodedOwner}.v1`;
};

export type GuestSession = { id: string };

function isProfile(value: unknown): value is OnboardingProfile {
  return Boolean(value && typeof value === 'object' && 'language' in value && 'ageGroup' in value);
}

export async function readProfile(owner: string, fallback = defaultProfile): Promise<OnboardingProfile> {
  try {
    const raw = await SecureStore.getItemAsync(profileKey(owner));
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return isProfile(value)
      ? { ...fallback, ...value, accessibility: { ...fallback.accessibility, ...value.accessibility } }
      : fallback;
  } catch {
    return fallback;
  }
}

export async function writeProfile(owner: string, profile: OnboardingProfile) {
  await SecureStore.setItemAsync(profileKey(owner), JSON.stringify(profile));
}

export async function readGuestSession(): Promise<GuestSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(guestSessionKey);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && 'id' in value && typeof value.id === 'string'
      ? { id: value.id }
      : null;
  } catch {
    return null;
  }
}

export async function writeGuestSession(session: GuestSession) {
  await SecureStore.setItemAsync(guestSessionKey, JSON.stringify(session));
}

export async function clearGuestSession() {
  const guest = await readGuestSession();
  await SecureStore.deleteItemAsync(guestSessionKey);
  if (guest) await SecureStore.deleteItemAsync(profileKey(`guest:${guest.id}`));
}

export async function readPendingLanguage(): Promise<SupportedLanguage | null> {
  const value = await SecureStore.getItemAsync(pendingLanguageKey);
  return value === 'en' || value === 'tw' ? value : null;
}

export async function writePendingLanguage(language: SupportedLanguage) {
  await SecureStore.setItemAsync(pendingLanguageKey, language);
}

export async function clearPendingLanguage() {
  await SecureStore.deleteItemAsync(pendingLanguageKey);
}
