import { accessibilityPreferences, ageGroups, languages, type AccessibilityPreference, type AgeGroup, type Language, type PreferencesPatch } from './contracts.js';
import { ValidationError } from './errors.js';

const nicknamePattern = /^\p{L}[\p{L}\s'\-]{1,23}$/u;
const knownPreferenceFields = new Set(['language', 'nickname', 'ageGroup', 'accessibilityPreferences']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertNoUnknownFields(value: Record<string, unknown>, allowed: Set<string>): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new ValidationError(`Unknown field: ${key}`);
  }
}

function parseEnum<T extends string>(value: unknown, values: readonly T[], name: string): T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new ValidationError(`Invalid ${name}.`);
  return value as T;
}

export function parsePreferencesPatch(input: unknown): PreferencesPatch {
  if (!isRecord(input)) throw new ValidationError('Request body must be a JSON object.');
  assertNoUnknownFields(input, knownPreferenceFields);
  if (Object.keys(input).length === 0) throw new ValidationError('At least one preference is required.');

  const patch: PreferencesPatch = {};
  if ('language' in input) patch.language = parseEnum<Language>(input.language, languages, 'language');
  if ('nickname' in input) {
    if (input.nickname !== null && (typeof input.nickname !== 'string' || !nicknamePattern.test(input.nickname.trim()))) {
      throw new ValidationError('Nickname must be 2–24 letters, spaces, apostrophes, or hyphens.');
    }
    patch.nickname = input.nickname === null ? null : input.nickname.trim();
  }
  if ('ageGroup' in input) {
    patch.ageGroup = input.ageGroup === null ? null : parseEnum<AgeGroup>(input.ageGroup, ageGroups, 'age group');
  }
  if ('accessibilityPreferences' in input) {
    if (!Array.isArray(input.accessibilityPreferences) || input.accessibilityPreferences.length > accessibilityPreferences.length) {
      throw new ValidationError('Accessibility preferences must be a short list.');
    }
    const parsed = input.accessibilityPreferences.map((value) => parseEnum<AccessibilityPreference>(value, accessibilityPreferences, 'accessibility preference'));
    if (new Set(parsed).size !== parsed.length) throw new ValidationError('Accessibility preferences must be unique.');
    patch.accessibilityPreferences = parsed;
  }
  return patch;
}

export function parseUpgradeConsent(input: unknown): void {
  if (!isRecord(input) || Object.keys(input).some((key) => key !== 'consent') || input.consent !== true) {
    throw new ValidationError('Explicit upgrade consent is required.');
  }
}

export function parseIdempotencyKey(value: string | null): string {
  if (!value || value.length < 8 || value.length > 128 || !/^[A-Za-z0-9._~-]+$/.test(value)) {
    throw new ValidationError('A valid Idempotency-Key header is required.');
  }
  return value;
}

export function parseBearerToken(value: string | null): string | null {
  if (!value) return null;
  const match = /^Bearer\s+([^\s]+)$/i.exec(value);
  if (!match) throw new ValidationError('Authorization must use a Bearer token.');
  return match[1];
}
