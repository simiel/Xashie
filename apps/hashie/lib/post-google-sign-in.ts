export type PostGoogleSignInAction =
  | { type: 'wait' }
  | { type: 'route'; destination: 'onboarding' | 'tabs' | 'upgrade' }
  | { type: 'error' };

type SessionStatus = 'loading' | 'signed-out' | 'guest' | 'signed-in' | 'error';
type SessionRecovery = 'none' | 'choose-actor' | 'guest-expired' | 'clerk-expired';

export function postGoogleSignInAction({
  isClerkLoaded,
  isSignedIn,
  sessionStatus,
  sessionRecovery,
  actorType,
  hasSavedPreferences,
  hasGuestUpgradeAvailable,
}: {
  isClerkLoaded: boolean;
  isSignedIn: boolean;
  sessionStatus: SessionStatus;
  sessionRecovery: SessionRecovery;
  actorType: 'guest' | 'clerk-user' | null;
  hasSavedPreferences: boolean;
  hasGuestUpgradeAvailable: boolean;
}): PostGoogleSignInAction {
  if (!isClerkLoaded || !isSignedIn || sessionStatus === 'loading') return { type: 'wait' };
  if (sessionStatus === 'signed-in' && actorType === 'clerk-user') {
    if (hasGuestUpgradeAvailable) return { type: 'route', destination: 'upgrade' };
    return { type: 'route', destination: hasSavedPreferences ? 'tabs' : 'onboarding' };
  }
  if (sessionStatus === 'error' || sessionRecovery === 'clerk-expired') return { type: 'error' };
  return { type: 'wait' };
}

export function sessionActivationDiagnostic(error: unknown): { stage: 'session_activation'; status: number | null; code: string; requestId: string | null } {
  if (error !== null && typeof error === 'object') {
    const candidate = error as { status?: unknown; code?: unknown; requestId?: unknown };
    return {
      stage: 'session_activation',
      status: typeof candidate.status === 'number' ? candidate.status : null,
      code: typeof candidate.code === 'string' ? candidate.code : 'unexpected_error',
      requestId: typeof candidate.requestId === 'string' ? candidate.requestId : null,
    };
  }
  return { stage: 'session_activation', status: null, code: 'unexpected_error', requestId: null };
}
