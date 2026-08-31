import { useAuth, useClerk } from '@clerk/expo';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';

import { clearGuestSession, clearPendingLanguage, readGuestSession, readPendingLanguage, readProfile, writeGuestSession, writePendingLanguage, writeProfile } from './storage';
import { defaultProfile, type OnboardingProfile, type SessionType } from './types';

type AuthProfileContextValue = {
  isReady: boolean;
  sessionType: SessionType;
  userId: string | null;
  profile: OnboardingProfile;
  guestModeEnabled: boolean;
  sessionExpired: boolean;
  updateProfile: (change: Partial<OnboardingProfile>) => Promise<void>;
  startGuestSession: () => Promise<void>;
  endGuestSession: () => Promise<void>;
  signOutAccount: () => Promise<void>;
  markSessionExpired: () => void;
  clearSessionExpired: () => void;
};

const AuthProfileContext = createContext<AuthProfileContextValue | null>(null);
const guestModeEnabled = process.env.EXPO_PUBLIC_HASHIE_GUEST_MODE_ENABLED !== 'false';

function createGuestId() {
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AuthProfileProvider({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { signOut } = useClerk();
  const [hydratedOwner, setHydratedOwner] = useState<string | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [profile, setProfile] = useState<OnboardingProfile>(defaultProfile);
  const [sessionExpired, setSessionExpired] = useState(false);
  const hadAccountSession = useRef(false);
  const hydrationOwner = isSignedIn && userId ? `account:${userId}` : 'guest';

  useEffect(() => {
    if (!isLoaded) return;
    let active = true;
    void (async () => {
      if (isSignedIn && userId) {
        const pendingLanguage = await readPendingLanguage();
        const accountProfile = await readProfile(`account:${userId}`, { ...defaultProfile, language: pendingLanguage ?? defaultProfile.language });
        await clearGuestSession();
        await clearPendingLanguage();
        if (!active) return;
        hadAccountSession.current = true;
        setGuestId(null);
        setProfile(accountProfile);
      } else {
        if (hadAccountSession.current) setSessionExpired(true);
        const guest = guestModeEnabled ? await readGuestSession() : null;
        const pendingLanguage = await readPendingLanguage();
        const guestProfile = guest ? await readProfile(`guest:${guest.id}`, { ...defaultProfile, language: pendingLanguage ?? defaultProfile.language }) : { ...defaultProfile, language: pendingLanguage ?? defaultProfile.language };
        if (!active) return;
        setGuestId(guest?.id ?? null);
        setProfile(guestProfile);
      }
      if (active) setHydratedOwner(hydrationOwner);
    })();
    return () => {
      active = false;
    };
  }, [hydrationOwner, isLoaded, isSignedIn, userId]);

  const sessionType: SessionType = isSignedIn && userId ? 'account' : guestId ? 'guest' : null;
  const owner = sessionType === 'account' && userId ? `account:${userId}` : guestId ? `guest:${guestId}` : null;

  const updateProfile = useCallback(
    async (change: Partial<OnboardingProfile>) => {
      const next = { ...profile, ...change };
      if (!owner) {
        setProfile(next);
        if (change.language) await writePendingLanguage(change.language);
        return;
      }
      setProfile(next);
      await writeProfile(owner, next);
    },
    [owner, profile],
  );

  const startGuestSession = useCallback(async () => {
    if (!guestModeEnabled) throw new Error('Guest mode is unavailable.');
    const id = createGuestId();
    await writeGuestSession({ id });
    const pendingLanguage = await readPendingLanguage();
    const guestProfile = await readProfile(`guest:${id}`, { ...defaultProfile, language: pendingLanguage ?? defaultProfile.language });
    await clearPendingLanguage();
    setGuestId(id);
    setProfile(guestProfile);
  }, []);

  const endGuestSession = useCallback(async () => {
    await clearGuestSession();
    setGuestId(null);
    setProfile(defaultProfile);
  }, []);

  const signOutAccount = useCallback(async () => {
    hadAccountSession.current = false;
    setSessionExpired(false);
    await signOut();
  }, [signOut]);

  const markSessionExpired = useCallback(() => setSessionExpired(true), []);
  const clearSessionExpired = useCallback(() => setSessionExpired(false), []);

  const value: AuthProfileContextValue = {
    isReady: isLoaded && hydratedOwner === hydrationOwner,
    sessionType,
    userId: userId ?? null,
    profile,
    guestModeEnabled,
    sessionExpired,
    updateProfile,
    startGuestSession,
    endGuestSession,
    signOutAccount,
    markSessionExpired,
    clearSessionExpired,
  };

  return <AuthProfileContext.Provider value={value}>{children}</AuthProfileContext.Provider>;
}

export function useAuthProfile() {
  const context = useContext(AuthProfileContext);
  if (!context) throw new Error('useAuthProfile must be used within AuthProfileProvider.');
  return context;
}
