import type { SupportedLanguage } from '@/content/copy';

export const ageGroups = ['under_13', '13_to_15', '16_to_17', '18_plus', 'unknown'] as const;
export type AgeGroup = (typeof ageGroups)[number];

export type AccessibilityPreferences = {
  screenReader: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  plainLanguage: boolean;
};

export type OnboardingProfile = {
  language: SupportedLanguage;
  ageGroup: AgeGroup;
  accessibility: AccessibilityPreferences;
  voiceFirst: boolean;
  supportInterests: string[];
  region?: string;
  completed: boolean;
};

export type SessionType = 'account' | 'guest' | null;

export const defaultProfile: OnboardingProfile = {
  language: 'en',
  ageGroup: 'unknown',
  accessibility: {
    screenReader: false,
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    plainLanguage: false,
  },
  voiceFirst: false,
  supportInterests: [],
  completed: false,
};
