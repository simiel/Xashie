export type StoredActorChoice = 'guest' | 'clerk-user';
export type CredentialState = 'valid' | 'missing' | 'expired';
export type SessionRecovery = 'none' | 'choose-actor' | 'guest-expired' | 'clerk-expired';
type AgeGroup = 'under-13' | '13-15' | '16-17' | '18-24' | '25-plus' | 'prefer-not-to-say';
type AccessibilityPreference = 'larger-text' | 'higher-contrast' | 'captions' | 'visual-details' | 'hearing-audio' | 'no-changes' | 'prefer-not-to-say';

export type RestoredActorDecision =
  | { status: 'guest'; choice: 'guest'; recovery: 'none' }
  | { status: 'signed-in'; choice: 'clerk-user'; recovery: 'none' }
  | { status: 'signed-out'; choice: null; recovery: SessionRecovery };

/**
 * Decides which already-authenticated actor may be restored. A saved selection
 * always wins. When there is no selection, two valid credentials require a
 * fresh user choice instead of silently selecting one private identity.
 */
export function reconcileStoredActor({
  savedChoice,
  guest,
  clerk,
}: {
  savedChoice: StoredActorChoice | null;
  guest: CredentialState;
  clerk: CredentialState;
}): RestoredActorDecision {
  if (savedChoice === 'guest') {
    return guest === 'valid'
      ? { status: 'guest', choice: 'guest', recovery: 'none' }
      : { status: 'signed-out', choice: null, recovery: 'guest-expired' };
  }

  if (savedChoice === 'clerk-user') {
    return clerk === 'valid'
      ? { status: 'signed-in', choice: 'clerk-user', recovery: 'none' }
      : { status: 'signed-out', choice: null, recovery: 'clerk-expired' };
  }

  if (guest === 'valid' && clerk === 'valid') {
    return { status: 'signed-out', choice: null, recovery: 'choose-actor' };
  }
  if (guest === 'valid') return { status: 'guest', choice: 'guest', recovery: 'none' };
  if (clerk === 'valid') return { status: 'signed-in', choice: 'clerk-user', recovery: 'none' };
  return { status: 'signed-out', choice: null, recovery: 'none' };
}

export function preferencesToOnboardingState(
  preferences: {
    language: 'english' | 'akan-twi' | null;
    nickname: string | null;
    ageGroup: AgeGroup | null;
    accessibilityPreferences: AccessibilityPreference[];
  } | null,
  accessChoice: 'guest' | 'google' | null,
) {
  return {
    accessChoice,
    language: preferences?.language ?? 'english',
    nickname: preferences?.nickname ?? '',
    ageGroup: preferences?.ageGroup ?? null,
    accessibilityPreferences: preferences?.accessibilityPreferences ?? [],
  };
}

/** Prevents an async chat callback from writing into a different actor's state. */
export function canApplyActorScopedUpdate({
  requestActorKey,
  currentActorKey,
  requestId,
  currentRequestId,
}: {
  requestActorKey: string | null;
  currentActorKey: string | null;
  requestId: number;
  currentRequestId: number;
}): boolean {
  return requestActorKey !== null
    && requestActorKey === currentActorKey
    && requestId === currentRequestId;
}
