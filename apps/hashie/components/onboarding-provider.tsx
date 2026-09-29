import { useAuth, useClerk } from '@clerk/expo';
import { AppState } from 'react-native';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  canApplyActorScopedUpdate,
  preferencesToOnboardingState,
  reconcileStoredActor,
  type CredentialState,
  type SessionRecovery,
  type StoredActorChoice,
} from '@/lib/actor-session';
import {
  clearGuestToken,
  clearStoredActorChoice,
  getGuestToken,
  getGuestUpgradeIdempotencyKey,
  getHashieErrorMessage,
  getStoredActorChoice,
  HashieApiError,
  hashieApi,
  saveGuestToken,
  saveStoredActorChoice,
  type HashieActor,
  type PreferencesPatch,
  type SessionCredentials,
} from '@/lib/hashie-api';
import { sessionActivationDiagnostic } from '@/lib/post-google-sign-in';
import {
  type AccessibilityPreference,
  initialOnboardingState,
  type Language,
  type OnboardingState,
  type AgeGroup,
} from '@/constants/onboarding';

export type ResolvedActor = {
  type: 'guest' | 'clerk-user';
  id: string;
  sessionId: string;
  key: string;
};

export type AuthSessionStatus = 'loading' | 'signed-out' | 'guest' | 'signed-in' | 'error';

type ActivationResult = {
  hasSavedPreferences: boolean;
  guestUpgradeAvailable: boolean;
};

type OnboardingContextValue = {
  state: OnboardingState;
  actor: ResolvedActor | null;
  sessionStatus: AuthSessionStatus;
  sessionRecovery: SessionRecovery;
  sessionError: string;
  hasSavedPreferences: boolean;
  hasGuestUpgradeAvailable: boolean;
  isEditingPreferences: boolean;
  setLanguage: (value: Language) => void;
  setNickname: (value: string) => void;
  setAgeGroup: (value: AgeGroup) => void;
  toggleAccessibilityPreference: (value: AccessibilityPreference) => void;
  clearAccessibilityPreferences: () => void;
  beginGuestSession: () => Promise<ActivationResult>;
  activateSignedInActor: () => Promise<ActivationResult>;
  completeOnboarding: () => Promise<boolean>;
  upgradeGuestSession: (consent: boolean) => Promise<boolean>;
  resetGuestSession: () => Promise<void>;
  signOutAccount: () => Promise<boolean>;
  refreshSession: () => Promise<void>;
  startPreferencesEdit: () => void;
  getActiveCredentials: (expectedActorKey?: string) => Promise<SessionCredentials | null>;
  handleAuthenticationFailure: (actorKey: string) => Promise<void>;
  isConnecting: boolean;
  submissionError: string;
  clearSubmissionError: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

function toResolvedActor(actor: HashieActor): ResolvedActor | null {
  if (actor.type === 'guest') {
    return { type: 'guest', id: actor.sessionId, sessionId: actor.sessionId, key: `guest:${actor.sessionId}` };
  }
  if (!actor.userId) return null;
  return { type: 'clerk-user', id: actor.userId, sessionId: actor.sessionId, key: `clerk-user:${actor.userId}` };
}

function actorStatus(actor: ResolvedActor): AuthSessionStatus {
  return actor.type === 'guest' ? 'guest' : 'signed-in';
}

function recoveryMessage(recovery: SessionRecovery): string {
  switch (recovery) {
    case 'guest-expired':
      return 'Your private guest session ended. Start a new guest session to continue.';
    case 'clerk-expired':
      return 'Your signed-in session needs attention. Sign out and sign in again to continue.';
    case 'choose-actor':
      return 'A private guest session and a signed-in account are both available. Choose which one to use.';
    default:
      return '';
  }
}

function credentialsFor(actor: ResolvedActor, guestToken: string | null, clerkToken: string | null): SessionCredentials | null {
  if (actor.type === 'guest' && guestToken) return { guestToken };
  if (actor.type === 'clerk-user' && clerkToken) return { clerkToken };
  return null;
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded: isClerkLoaded, isSignedIn, userId } = useAuth();
  const { signOut } = useClerk();
  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const [actor, setActor] = useState<ResolvedActor | null>(null);
  const [sessionStatus, setSessionStatus] = useState<AuthSessionStatus>('loading');
  const [sessionRecovery, setSessionRecovery] = useState<SessionRecovery>('none');
  const [sessionError, setSessionError] = useState('');
  const [hasSavedPreferences, setHasSavedPreferences] = useState(false);
  const [hasGuestUpgradeAvailable, setHasGuestUpgradeAvailable] = useState(false);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const actorRef = useRef<ResolvedActor | null>(null);
  const restoreRequestRef = useRef(0);

  const setSignedOut = useCallback((recovery: SessionRecovery = 'none', error = '') => {
    actorRef.current = null;
    setActor(null);
    setState({ ...initialOnboardingState });
    setHasSavedPreferences(false);
    setHasGuestUpgradeAvailable(false);
    setIsEditingPreferences(false);
    setSessionRecovery(recovery);
    setSessionError(error || recoveryMessage(recovery));
    setSessionStatus(error ? 'error' : 'signed-out');
  }, []);

  const inspectGuest = useCallback(async (): Promise<{ state: CredentialState; actor: HashieActor | null }> => {
    const guestToken = await getGuestToken();
    if (!guestToken) return { state: 'missing', actor: null };
    try {
      const session = await hashieApi.getSession({ guestToken });
      if (session.status !== 'authenticated' || !session.actor || session.actor.type !== 'guest') {
        return { state: 'expired', actor: null };
      }
      return { state: 'valid', actor: session.actor };
    } catch (error) {
      if (error instanceof HashieApiError && error.status === 401) return { state: 'expired', actor: null };
      throw error;
    }
  }, []);

  const inspectClerk = useCallback(async (): Promise<{ state: CredentialState; actor: HashieActor | null }> => {
    const clerkToken = await getToken();
    if (!clerkToken) return { state: isSignedIn ? 'expired' : 'missing', actor: null };
    try {
      const session = await hashieApi.getSession({ clerkToken });
      if (session.status !== 'authenticated' || !session.actor || session.actor.type !== 'clerk-user') {
        return { state: 'expired', actor: null };
      }
      return { state: 'valid', actor: session.actor };
    } catch (error) {
      if (error instanceof HashieApiError && error.status === 401) return { state: 'expired', actor: null };
      throw error;
    }
  }, [getToken, isSignedIn]);

  const activate = useCallback(async (candidate: HashieActor, choice: StoredActorChoice, requestId?: number): Promise<ActivationResult> => {
    const nextActor = toResolvedActor(candidate);
    if (!nextActor) throw new HashieApiError('The signed-in session is incomplete.', 401, 'invalid_credentials');
    const credentials = choice === 'guest'
      ? credentialsFor(nextActor, await getGuestToken(), null)
      : credentialsFor(nextActor, null, await getToken());
    if (!credentials) throw new HashieApiError('The selected session is unavailable.', 401, 'invalid_credentials');
    const preferencesResult = await hashieApi.getPreferences(credentials);
    if (requestId !== undefined && requestId !== restoreRequestRef.current) {
      return { hasSavedPreferences: false, guestUpgradeAvailable: false };
    }
    actorRef.current = nextActor;
    setActor(nextActor);
    setState(preferencesToOnboardingState(preferencesResult.preferences, choice === 'guest' ? 'guest' : 'google'));
    setHasSavedPreferences(preferencesResult.preferences !== null);
    setSessionStatus(actorStatus(nextActor));
    setSessionRecovery('none');
    setSessionError('');
    await saveStoredActorChoice(choice);
    return { hasSavedPreferences: preferencesResult.preferences !== null, guestUpgradeAvailable: hasGuestUpgradeAvailable };
  }, [getToken, hasGuestUpgradeAvailable]);

  const refreshSession = useCallback(async () => {
    if (!isClerkLoaded) return;
    const requestId = ++restoreRequestRef.current;
    let restoringChoice: StoredActorChoice | null = null;
    setSessionStatus('loading');
    setSessionError('');
    try {
      const savedChoice = await getStoredActorChoice();
      if (savedChoice === 'guest') {
        restoringChoice = 'guest';
        const guest = await inspectGuest();
        if (guest.state === 'expired') {
          await clearGuestToken();
          await clearStoredActorChoice();
        }
        if (requestId !== restoreRequestRef.current) return;
        const decision = reconcileStoredActor({ savedChoice, guest: guest.state, clerk: 'missing' });
        if (decision.status === 'guest' && guest.actor) await activate(guest.actor, 'guest', requestId);
        else setSignedOut(decision.recovery);
        return;
      }

      if (savedChoice === 'clerk-user') {
        restoringChoice = 'clerk-user';
        const [clerk, guest] = await Promise.all([inspectClerk(), inspectGuest()]);
        if (guest.state === 'expired') await clearGuestToken();
        if (requestId !== restoreRequestRef.current) return;
        const decision = reconcileStoredActor({ savedChoice, guest: 'missing', clerk: clerk.state });
        setHasGuestUpgradeAvailable(guest.state === 'valid');
        if (decision.status === 'signed-in' && clerk.actor) await activate(clerk.actor, 'clerk-user', requestId);
        else {
          await clearStoredActorChoice();
          setSignedOut(decision.recovery);
        }
        return;
      }

      const [guest, clerk] = await Promise.all([inspectGuest(), inspectClerk()]);
      if (guest.state === 'expired') await clearGuestToken();
      if (requestId !== restoreRequestRef.current) return;
      const decision = reconcileStoredActor({ savedChoice: null, guest: guest.state, clerk: clerk.state });
      setHasGuestUpgradeAvailable(guest.state === 'valid' && clerk.state === 'valid');
      if (decision.status === 'guest' && guest.actor) {
        restoringChoice = 'guest';
        await activate(guest.actor, 'guest', requestId);
      } else if (decision.status === 'signed-in' && clerk.actor) {
        restoringChoice = 'clerk-user';
        await activate(clerk.actor, 'clerk-user', requestId);
      }
      else setSignedOut(decision.recovery);
    } catch (error) {
      if (requestId !== restoreRequestRef.current) return;
      if (__DEV__) console.info('[Hashie auth] Session activation failed', sessionActivationDiagnostic(error));
      if (error instanceof HashieApiError && error.status === 401) {
        if (restoringChoice === 'guest') {
          await clearGuestToken();
          await clearStoredActorChoice();
          setSignedOut('guest-expired');
          return;
        }
        if (restoringChoice === 'clerk-user') {
          await clearStoredActorChoice();
          setSignedOut('clerk-expired');
          return;
        }
      }
      setSignedOut('none', getHashieErrorMessage(error));
    }
  }, [activate, inspectClerk, inspectGuest, isClerkLoaded, setSignedOut]);

  useEffect(() => {
    void refreshSession();
  }, [isClerkLoaded, isSignedIn, userId]);

  useEffect(() => {
    if (isClerkLoaded) return;
    const timeout = setTimeout(() => {
      if (!isClerkLoaded && !actorRef.current) {
        setSessionRecovery('none');
        setSessionStatus('error');
        setSessionError('Sign-in is still getting ready. You can browse the offline library or try again shortly.');
      }
    }, 8_000);
    return () => clearTimeout(timeout);
  }, [isClerkLoaded]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') void refreshSession();
    });
    return () => subscription.remove();
  }, [refreshSession]);

  const beginGuestSession = useCallback(async (): Promise<ActivationResult> => {
    setIsConnecting(true);
    setIsEditingPreferences(false);
    setSubmissionError('');
    try {
      const existing = await inspectGuest();
      if (existing.state === 'valid' && existing.actor) {
        const result = await activate(existing.actor, 'guest');
        setHasGuestUpgradeAvailable(false);
        return { ...result, guestUpgradeAvailable: false };
      }
      if (existing.state === 'expired') await clearGuestToken();
      const created = await hashieApi.createGuestSession();
      await saveGuestToken(created.token);
      const session = await hashieApi.getSession({ guestToken: created.token });
      if (!session.actor || session.actor.type !== 'guest') throw new HashieApiError('Guest session is unavailable.', 401, 'invalid_credentials');
      const result = await activate(session.actor, 'guest');
      setHasGuestUpgradeAvailable(false);
      return { ...result, guestUpgradeAvailable: false };
    } catch (error) {
      setSubmissionError(getHashieErrorMessage(error));
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [activate, inspectGuest]);

  const activateSignedInActor = useCallback(async (): Promise<ActivationResult> => {
    setIsConnecting(true);
    setIsEditingPreferences(false);
    setSubmissionError('');
    try {
      const [clerk, guest] = await Promise.all([inspectClerk(), inspectGuest()]);
      if (guest.state === 'expired') await clearGuestToken();
      if (clerk.state !== 'valid' || !clerk.actor) {
        await clearStoredActorChoice();
        setSignedOut('clerk-expired');
        throw new HashieApiError('Signed-in session is unavailable.', 401, 'invalid_credentials');
      }
      const guestUpgradeAvailable = guest.state === 'valid';
      setHasGuestUpgradeAvailable(guestUpgradeAvailable);
      const result = await activate(clerk.actor, 'clerk-user');
      return { ...result, guestUpgradeAvailable };
    } catch (error) {
      setSubmissionError(getHashieErrorMessage(error));
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, [activate, inspectClerk, inspectGuest, setSignedOut]);

  const getActiveCredentials = useCallback(async (expectedActorKey?: string): Promise<SessionCredentials | null> => {
    const activeActor = actorRef.current;
    if (!activeActor || (expectedActorKey && activeActor.key !== expectedActorKey)) return null;
    const credentials = activeActor.type === 'guest'
      ? credentialsFor(activeActor, await getGuestToken(), null)
      : credentialsFor(activeActor, null, await getToken());
    return actorRef.current?.key === activeActor.key ? credentials : null;
  }, [getToken]);

  const handleAuthenticationFailure = useCallback(async (actorKey: string) => {
    const activeActor = actorRef.current;
    if (!activeActor || activeActor.key !== actorKey) return;
    if (activeActor.type === 'guest') {
      await clearGuestToken();
      await clearStoredActorChoice();
      setHasGuestUpgradeAvailable(false);
      setSignedOut('guest-expired');
      return;
    }
    await clearStoredActorChoice();
    setSignedOut('clerk-expired');
  }, [setSignedOut]);

  const completeOnboarding = useCallback(async () => {
    const activeActor = actorRef.current;
    if (!activeActor) {
      setSubmissionError('Choose a private session before saving preferences.');
      return false;
    }
    setIsConnecting(true);
    setSubmissionError('');
    try {
      const credentials = await getActiveCredentials();
      if (!credentials) throw new HashieApiError('The active session is unavailable.', 401, 'invalid_credentials');
      const preferences: PreferencesPatch = {
        language: state.language,
        nickname: state.nickname.trim() || null,
        ageGroup: state.ageGroup,
        accessibilityPreferences: state.accessibilityPreferences,
      };
      const result = await hashieApi.patchPreferences(preferences, credentials);
      if (canApplyActorScopedUpdate({ requestActorKey: activeActor.key, currentActorKey: actorRef.current?.key ?? null, requestId: 0, currentRequestId: 0 })) {
        setState(preferencesToOnboardingState(result.preferences, activeActor.type === 'guest' ? 'guest' : 'google'));
        setHasSavedPreferences(true);
      }
      setIsEditingPreferences(false);
      return true;
    } catch (error) {
      if (error instanceof HashieApiError && error.status === 401) await handleAuthenticationFailure(activeActor.key);
      setSubmissionError(getHashieErrorMessage(error));
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [getActiveCredentials, handleAuthenticationFailure, state]);

  const upgradeGuestSession = useCallback(async (consent: boolean) => {
    const activeActor = actorRef.current;
    if (!consent) {
      setSubmissionError('Choose the consent option before moving guest preferences.');
      return false;
    }
    if (!activeActor || activeActor.type !== 'clerk-user' || !hasGuestUpgradeAvailable) {
      setSubmissionError('There is no active guest session available to move.');
      return false;
    }
    setIsConnecting(true);
    setSubmissionError('');
    try {
      const [guestToken, clerkToken, idempotencyKey] = await Promise.all([
        getGuestToken(),
        getToken(),
        getGuestUpgradeIdempotencyKey(),
      ]);
      if (!guestToken || !clerkToken) throw new HashieApiError('The sessions needed for this transfer are unavailable.', 401, 'invalid_credentials');
      await hashieApi.upgradeGuestSession({ guestToken, clerkToken, idempotencyKey });
      await clearGuestToken();
      setHasGuestUpgradeAvailable(false);
      const preferencesResult = await hashieApi.getPreferences({ clerkToken });
      if (actorRef.current?.key === activeActor.key) {
        setState(preferencesToOnboardingState(preferencesResult.preferences, 'google'));
        setHasSavedPreferences(preferencesResult.preferences !== null);
      }
      return true;
    } catch (error) {
      if (error instanceof HashieApiError && error.status === 409) {
        await clearGuestToken();
        setHasGuestUpgradeAvailable(false);
      }
      if (error instanceof HashieApiError && error.status === 401) {
        try {
          const guest = await inspectGuest();
          if (guest.state === 'expired') {
            await clearGuestToken();
            setHasGuestUpgradeAvailable(false);
          }
        } catch {
          // Keep the guest credential until a later safe reconciliation can verify it.
        }
        await handleAuthenticationFailure(activeActor.key);
      }
      setSubmissionError(getHashieErrorMessage(error));
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [getToken, handleAuthenticationFailure, hasGuestUpgradeAvailable, inspectGuest]);

  const resetGuestSession = useCallback(async () => {
    const activeActor = actorRef.current;
    if (!activeActor || activeActor.type !== 'guest') return;
    setIsConnecting(true);
    let cleanupWarning = '';
    try {
      const credentials = await getActiveCredentials(activeActor.key);
      if (credentials) await hashieApi.deletePreferences(credentials);
    } catch (error) {
      if (!(error instanceof HashieApiError && error.status === 401)) {
        cleanupWarning = 'The guest session was removed from this device, but Hashie could not confirm deletion of its saved choices. They will expire with the short-lived guest record.';
      }
    } finally {
      await Promise.all([clearGuestToken(), clearStoredActorChoice()]);
      setSignedOut('none', cleanupWarning);
      setIsConnecting(false);
    }
  }, [getActiveCredentials, setSignedOut]);

  const signOutAccount = useCallback(async () => {
    if (!isSignedIn) {
      await clearStoredActorChoice();
      setSignedOut('none');
      return true;
    }
    setIsConnecting(true);
    setSubmissionError('');
    try {
      await signOut();
      await clearStoredActorChoice();
      setSignedOut('none');
      return true;
    } catch (error) {
      setSignedOut('none', 'Hashie could not sign this account out. Please try again before switching accounts.');
      setSubmissionError(getHashieErrorMessage(error));
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isSignedIn, setSignedOut, signOut]);

  const value = useMemo<OnboardingContextValue>(() => ({
    state,
    actor,
    sessionStatus,
    sessionRecovery,
    sessionError,
    hasSavedPreferences,
    hasGuestUpgradeAvailable,
    isEditingPreferences,
    setLanguage: (language) => setState((current) => ({ ...current, language })),
    setNickname: (nickname) => setState((current) => ({ ...current, nickname })),
    setAgeGroup: (ageGroup) => setState((current) => ({ ...current, ageGroup })),
    toggleAccessibilityPreference: (preference) => setState((current) => {
      const preferences = current.accessibilityPreferences.includes(preference)
        ? current.accessibilityPreferences.filter((item) => item !== preference)
        : [...current.accessibilityPreferences, preference];
      return {
        ...current,
        accessibilityPreferences: preferences
          .filter((item) => item !== 'no-changes' || preferences.length === 1)
          .filter((item) => item !== 'prefer-not-to-say' || preferences.length === 1),
      };
    }),
    clearAccessibilityPreferences: () => setState((current) => ({ ...current, accessibilityPreferences: [] })),
    beginGuestSession,
    activateSignedInActor,
    completeOnboarding,
    upgradeGuestSession,
    resetGuestSession,
    signOutAccount,
    refreshSession,
    startPreferencesEdit: () => setIsEditingPreferences(true),
    getActiveCredentials,
    handleAuthenticationFailure,
    isConnecting,
    submissionError,
    clearSubmissionError: () => setSubmissionError(''),
  }), [
    activateSignedInActor,
    actor,
    beginGuestSession,
    completeOnboarding,
    getActiveCredentials,
    handleAuthenticationFailure,
    hasGuestUpgradeAvailable,
    hasSavedPreferences,
    isConnecting,
    isEditingPreferences,
    refreshSession,
    resetGuestSession,
    sessionError,
    sessionRecovery,
    sessionStatus,
    signOutAccount,
    state,
    submissionError,
    upgradeGuestSession,
  ]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return context;
}
