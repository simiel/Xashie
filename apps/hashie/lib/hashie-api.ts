import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import type { AccessibilityPreference, AgeGroup, Language } from '@/constants/onboarding';

const guestTokenStorageKey = 'hashie.guest-session-token';
const activeActorStorageKey = 'hashie.active-actor-choice';
const guestUpgradeIdempotencyKeyStorageKey = 'hashie.guest-upgrade-idempotency-key';
const requestTimeoutMs = 12_000;

export type HashieActor = { type: 'guest' | 'clerk-user'; sessionId: string; userId?: string };
export type HashiePreferences = {
  language: Language | null;
  nickname: string | null;
  ageGroup: AgeGroup | null;
  accessibilityPreferences: AccessibilityPreference[];
  updatedAt?: string;
};
export type PreferencesPatch = Omit<HashiePreferences, 'updatedAt'>;
export type StoredActorChoice = 'guest' | 'clerk-user';
export type SessionCredentials = { guestToken?: string | null; clerkToken?: string | null };

export class HashieApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;

  constructor(message: string, status: number, code: string, requestId: string | null = null) {
    super(message);
    this.name = 'HashieApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

function apiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_HASHIE_API_BASE_URL?.trim();
  if (!configuredUrl) throw new HashieApiError('Hashie is not configured for this device.', 0, 'configuration_error');
  return configuredUrl.replace(/\/+$/, '');
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function userFacingMessage(status: number, code: string): string {
  if (status === 0 || code === 'network_error' || code === 'timeout') return 'Hashie could not reach its service. Check your connection and try again.';
  if (status === 401 || code === 'invalid_credentials') return 'This session needs to be restored before you continue.';
  if (status === 409 || code === 'upgrade_conflict') return 'That guest session can no longer be moved to this account.';
  if (status === 429 || code === 'rate_limited') return 'Please wait a moment, then try again.';
  if (status >= 500 || code === 'service_unavailable' || code === 'service_not_configured') return 'Hashie is temporarily unavailable. Please try again shortly.';
  return 'Hashie could not save this yet. Please check your choices and try again.';
}

export function getHashieErrorMessage(error: unknown): string {
  if (error instanceof HashieApiError) return userFacingMessage(error.status, error.code);
  return 'Hashie could not complete that step. Please try again.';
}

type RequestOptions = SessionCredentials & {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  allowBothCredentials?: boolean;
};
type AgentHistoryMessage = { role: 'user' | 'assistant'; content: string };
type StreamAgentOptions = Pick<RequestOptions, 'guestToken' | 'clerkToken'> & {
  message: string;
  history: AgentHistoryMessage[];
  signal?: AbortSignal;
  onText: (text: string) => void;
};

export class HashieApiClient {
  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (options.guestToken && options.clerkToken && !options.allowBothCredentials) {
      throw new HashieApiError('Conflicting session credentials.', 400, 'conflicting_credentials');
    }
    const headers: Record<string, string> = { accept: 'application/json', ...options.headers };
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.guestToken) headers['x-hashie-guest-token'] = options.guestToken;
    if (options.clerkToken) headers.authorization = `Bearer ${options.clerkToken}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    let response: Response;
    try {
      response = await fetch(`${apiBaseUrl()}${path}`, {
        method: options.method ?? 'GET', headers, body: options.body === undefined ? undefined : JSON.stringify(options.body), signal: controller.signal,
      });
    } catch (error) {
      const code = error instanceof DOMException && error.name === 'AbortError' ? 'timeout' : 'network_error';
      throw new HashieApiError(userFacingMessage(0, code), 0, code);
    } finally {
      clearTimeout(timeout);
    }
    let payload: unknown = null;
    try { payload = await response.json(); } catch { /* Keep malformed responses out of the UI. */ }
    if (!response.ok) {
      const errorPayload = payload as { error?: { code?: unknown }; requestId?: unknown } | null;
      const code = safeString(errorPayload?.error?.code) ?? 'request_failed';
      const requestId = safeString(errorPayload?.requestId) ?? response.headers.get('x-request-id');
      throw new HashieApiError(userFacingMessage(response.status, code), response.status, code, requestId);
    }
    return payload as T;
  }

  createGuestSession() {
    return this.request<{ token: string; session: { actor: 'guest'; expiresAt: string } }>('/v1/guest-sessions', { method: 'POST' });
  }

  getSession(credentials: SessionCredentials = {}) {
    return this.request<{ actor: HashieActor | null; status: 'authenticated' | 'signed-out' }>('/v1/session', credentials);
  }

  getPreferences(credentials: SessionCredentials) {
    return this.request<{ actor: HashieActor; preferences: HashiePreferences | null }>('/v1/me/preferences', credentials);
  }

  patchPreferences(preferences: PreferencesPatch, credentials: SessionCredentials) {
    return this.request<{ actor: HashieActor; preferences: HashiePreferences }>('/v1/me/preferences', { ...credentials, method: 'PATCH', body: preferences });
  }

  deletePreferences(credentials: SessionCredentials) {
    return this.request<void>('/v1/me/preferences', { ...credentials, method: 'DELETE' });
  }

  upgradeGuestSession({ guestToken, clerkToken, idempotencyKey }: {
    guestToken: string;
    clerkToken: string;
    idempotencyKey: string;
  }) {
    return this.request<{
      actor: HashieActor;
      alreadyUpgraded: boolean;
      migratedPreferences: boolean;
    }>('/v1/guest-sessions/upgrade', {
      guestToken,
      clerkToken,
      allowBothCredentials: true,
      headers: { 'idempotency-key': idempotencyKey },
      method: 'POST',
      body: { consent: true },
    });
  }

  async streamAgent({ message, history, guestToken, clerkToken, signal, onText }: StreamAgentOptions): Promise<void> {
    if (guestToken && clerkToken) throw new HashieApiError('Conflicting session credentials.', 400, 'conflicting_credentials');
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort, { once: true });
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30_000);
    try {
      const headers: Record<string, string> = { accept: 'text/plain', 'content-type': 'application/json' };
      if (guestToken) headers['x-hashie-guest-token'] = guestToken;
      if (clerkToken) headers.authorization = `Bearer ${clerkToken}`;
      let response: Response;
      try {
        response = await fetch(`${apiBaseUrl()}/v1/agent/stream`, {
          method: 'POST', headers, body: JSON.stringify({ message, history }), signal: controller.signal,
        });
      } catch (error) {
        if (signal?.aborted) throw new HashieApiError('Reply stopped.', 0, 'aborted');
        if (timedOut) throw new HashieApiError('Hashie took too long to reply.', 0, 'timeout');
        throw new HashieApiError('Hashie could not reach its service.', 0, 'network_error');
      }
      if (!response.ok) {
        let payload: { error?: { code?: unknown }; requestId?: unknown } | null = null;
        try { payload = JSON.parse(await response.text()); } catch { /* Keep malformed server data out of the UI. */ }
        const code = safeString(payload?.error?.code) ?? 'request_failed';
        throw new HashieApiError(userFacingMessage(response.status, code), response.status, code, safeString(payload?.requestId) ?? response.headers.get('x-request-id'));
      }
      if (!response.body) throw new HashieApiError('Hashie sent an empty reply.', 502, 'service_unavailable');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          if (text) onText(text);
        }
        const remaining = decoder.decode();
        if (remaining) onText(remaining);
      } catch (error) {
        if (signal?.aborted) throw new HashieApiError('Reply stopped.', 0, 'aborted');
        if (timedOut) throw new HashieApiError('Hashie took too long to reply.', 0, 'timeout');
        throw error;
      }
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    }
  }
}

export const hashieApi = new HashieApiClient();

export function getGuestToken(): Promise<string | null> { return SecureStore.getItemAsync(guestTokenStorageKey); }
export function saveGuestToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(guestTokenStorageKey, token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
export function getStoredActorChoice(): Promise<StoredActorChoice | null> {
  return SecureStore.getItemAsync(activeActorStorageKey).then((value) => value === 'guest' || value === 'clerk-user' ? value : null);
}
export function saveStoredActorChoice(choice: StoredActorChoice): Promise<void> {
  return SecureStore.setItemAsync(activeActorStorageKey, choice, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
}
export function clearStoredActorChoice(): Promise<void> {
  return SecureStore.deleteItemAsync(activeActorStorageKey);
}
export async function getGuestUpgradeIdempotencyKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(guestUpgradeIdempotencyKeyStorageKey);
  if (existing) return existing;
  const key = randomUUID();
  await SecureStore.setItemAsync(guestUpgradeIdempotencyKeyStorageKey, key, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  return key;
}
export function clearGuestUpgradeIdempotencyKey(): Promise<void> {
  return SecureStore.deleteItemAsync(guestUpgradeIdempotencyKeyStorageKey);
}
export async function clearGuestToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(guestTokenStorageKey),
    clearGuestUpgradeIdempotencyKey(),
  ]);
}
