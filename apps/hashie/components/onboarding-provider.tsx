import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { useAuth } from '@clerk/expo';

import {
  AccessibilityPreference,
  initialOnboardingState,
  Language,
  OnboardingState,
  AccessChoice,
  AgeGroup,
} from '@/constants/onboarding';
import { getGuestToken, getHashieErrorMessage, hashieApi, saveGuestToken } from '@/lib/hashie-api';

type OnboardingContextValue = {
  state: OnboardingState;
  setAccessChoice: (value: AccessChoice) => void;
  setLanguage: (value: Language) => void;
  setNickname: (value: string) => void;
  setAgeGroup: (value: AgeGroup) => void;
  toggleAccessibilityPreference: (value: AccessibilityPreference) => void;
  clearAccessibilityPreferences: () => void;
  beginGuestSession: () => Promise<void>;
  completeOnboarding: () => Promise<boolean>;
  isConnecting: boolean;
  submissionError: string;
  clearSubmissionError: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialOnboardingState);
  const [isConnecting, setIsConnecting] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const { getToken } = useAuth();

  const beginGuestSession = async () => {
    setIsConnecting(true);
    setSubmissionError('');
    try {
      const result = await hashieApi.createGuestSession();
      await saveGuestToken(result.token);
      setState((current) => ({ ...current, accessChoice: 'guest' }));
    } catch (error) {
      setSubmissionError(getHashieErrorMessage(error));
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const completeOnboarding = async () => {
    setIsConnecting(true);
    setSubmissionError('');
    try {
      const preferences = {
        language: state.language,
        nickname: state.nickname.trim() || null,
        ageGroup: state.ageGroup,
        accessibilityPreferences: state.accessibilityPreferences,
      };
      if (state.accessChoice === 'guest') {
        const guestToken = await getGuestToken();
        if (!guestToken) throw new Error('Guest session is missing.');
        await hashieApi.patchPreferences(preferences, { guestToken });
      } else if (state.accessChoice === 'google') {
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error('Signed-in session is missing.');
        await hashieApi.patchPreferences(preferences, { clerkToken });
      } else {
        throw new Error('Access choice is missing.');
      }
      return true;
    } catch (error) {
      setSubmissionError(getHashieErrorMessage(error));
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      setAccessChoice: (accessChoice) => setState((current) => ({ ...current, accessChoice })),
      setLanguage: (language) => setState((current) => ({ ...current, language })),
      setNickname: (nickname) => setState((current) => ({ ...current, nickname })),
      setAgeGroup: (ageGroup) => setState((current) => ({ ...current, ageGroup })),
      toggleAccessibilityPreference: (preference) =>
        setState((current) => {
          const currentPreferences = current.accessibilityPreferences;
          const isSelected = currentPreferences.includes(preference);
          const preferences = isSelected
            ? currentPreferences.filter((item) => item !== preference)
            : [...currentPreferences, preference];

          return {
            ...current,
            accessibilityPreferences: preferences.filter(
              (item) =>
                item !== 'no-changes' || preferences.length === 1,
            ).filter(
              (item) =>
                item !== 'prefer-not-to-say' || preferences.length === 1,
            ),
          };
        }),
      clearAccessibilityPreferences: () =>
        setState((current) => ({ ...current, accessibilityPreferences: [] })),
      beginGuestSession,
      completeOnboarding,
      isConnecting,
      submissionError,
      clearSubmissionError: () => setSubmissionError(''),
    }),
    [beginGuestSession, completeOnboarding, getToken, isConnecting, state, submissionError],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used inside OnboardingProvider');
  }
  return context;
}
