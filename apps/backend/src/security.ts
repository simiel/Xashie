import { createHash, randomBytes, randomUUID } from 'node:crypto';

export const guestSessionTtlMs = 24 * 60 * 60 * 1000;

export function createOpaqueGuestToken(): string {
  return `ghs_${randomBytes(32).toString('base64url')}`;
}

export function hashSecret(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function createRequestId(): string {
  return randomUUID();
}

export function isExpired(expiresAt: string, now: Date): boolean {
  return Date.parse(expiresAt) <= now.getTime();
}

export function toIso(now: Date): string {
  return now.toISOString();
}
