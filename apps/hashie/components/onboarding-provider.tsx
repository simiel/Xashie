import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import {
  AccessibilityPreference,
  initialOnboardingState,
  Language,
  OnboardingState,
  AccessChoice,
  AgeGroup,
} from '@/constants/onboarding';

type OnboardingContextValue = {
  state: OnboardingState;
  setAccessChoice: (value: AccessChoice) => void;
  setLanguage: (value: Language) => void;
  setNickname: (value: string) => void;
  setAgeGroup: (value: AgeGroup) => void;
  toggleAccessibilityPreference: (value: AccessibilityPreference) => void;
  clearAccessibilityPreferences: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialOnboardingState);

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
    }),
    [state],
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
