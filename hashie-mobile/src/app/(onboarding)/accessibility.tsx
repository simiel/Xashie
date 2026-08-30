import { router } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { goBackOrReplace } from '@/auth/navigation';
import { AuthScreen, ChoiceButton, PrimaryButton, SecondaryButton } from '@/components/auth-screen';
import { View } from '@/ui/primitives';

const preferences = [
  ['screenReader', 'I use a screen reader', 'Keep spoken labels and status updates clear.'],
  ['highContrast', 'Higher contrast', 'Use stronger visual contrast where supported.'],
  ['reducedMotion', 'Reduce motion', 'Avoid unnecessary movement.'],
  ['largeText', 'Larger text', 'Prioritize comfortable reading.'],
  ['plainLanguage', 'Plain language', 'Prefer shorter, clearer explanations.'],
] as const;

export default function AccessibilityOnboardingScreen() {
  const { profile, updateProfile } = useAuthProfile();
  const toggle = (key: keyof typeof profile.accessibility) => void updateProfile({ accessibility: { ...profile.accessibility, [key]: !profile.accessibility[key] } });
  return <AuthScreen step={{ current: 3, total: 5 }} title="Make Hashie easier to use" body="These are preferences, not a record of a disability. You can change them later.">
    <View accessibilityRole="radiogroup" className="gap-3">{preferences.map(([key, label, hint]) => <ChoiceButton key={key} label={label} hint={hint} selected={profile.accessibility[key]} onPress={() => toggle(key)} />)}</View>
    <PrimaryButton label="Continue" hint="Save accessibility preferences and continue" onPress={() => router.push('/profile')} />
    <SecondaryButton label="Skip for now" hint="Continue without changing accessibility preferences" onPress={() => router.push('/profile')} />
    <SecondaryButton label="Back" hint="Return to age group selection" onPress={() => goBackOrReplace('/age')} />
  </AuthScreen>;
}
