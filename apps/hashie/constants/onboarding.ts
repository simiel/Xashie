export type AccessChoice = 'guest' | 'google';
export type Language = 'english' | 'akan-twi';
export type AgeGroup = 'under-13' | '13-15' | '16-17' | '18-24' | '25-plus' | 'prefer-not-to-say';
export type AccessibilityPreference =
  | 'larger-text'
  | 'higher-contrast'
  | 'captions'
  | 'visual-details'
  | 'hearing-audio'
  | 'no-changes'
  | 'prefer-not-to-say';

export type OnboardingState = {
  accessChoice: AccessChoice | null;
  language: Language | null;
  nickname: string;
  ageGroup: AgeGroup | null;
  accessibilityPreferences: AccessibilityPreference[];
};

export const initialOnboardingState: OnboardingState = {
  accessChoice: null,
  language: 'english',
  nickname: '',
  ageGroup: null,
  accessibilityPreferences: [],
};

export const ageGroupOptions: Array<{ value: AgeGroup; label: string }> = [
  { value: 'under-13', label: 'Under 13' },
  { value: '13-15', label: '13–15' },
  { value: '16-17', label: '16–17' },
  { value: '18-24', label: '18–24' },
  { value: '25-plus', label: '25 or older' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export const accessibilityOptions: Array<{
  value: AccessibilityPreference;
  label: string;
  symbol: string;
}> = [
  { value: 'larger-text', label: 'Larger text', symbol: 'Aa' },
  { value: 'higher-contrast', label: 'Higher contrast', symbol: '◐' },
  { value: 'captions', label: 'Captions and transcripts', symbol: 'CC' },
  { value: 'visual-details', label: 'Help seeing visual details', symbol: '◉' },
  { value: 'hearing-audio', label: 'Help hearing audio', symbol: '◖)' },
  { value: 'no-changes', label: 'No changes needed', symbol: '✦' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say', symbol: '•••' },
];
