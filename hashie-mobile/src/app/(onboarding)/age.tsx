import { router } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { goBackOrReplace } from '@/auth/navigation';
import { AuthScreen, ChoiceButton, PrimaryButton, SecondaryButton, StatusMessage } from '@/components/auth-screen';
import type { AgeGroup } from '@/auth/types';
import { View } from '@/ui/primitives';

const choices: { value: AgeGroup; label: string; hint: string }[] = [
  { value: 'under_13', label: 'Under 13', hint: 'Use an age-appropriate, more protected experience.' },
  { value: '13_to_15', label: '13 to 15', hint: 'Use an age-appropriate, more protected experience.' },
  { value: '16_to_17', label: '16 to 17', hint: 'Use an age-aware experience with stronger safety checks.' },
  { value: '18_plus', label: '18 or older', hint: 'Use the adult experience.' },
  { value: 'unknown', label: 'Prefer not to say', hint: 'Hashie will use the safest general setting.' },
];

export default function AgeOnboardingScreen() {
  const { profile, updateProfile } = useAuthProfile();
  return <AuthScreen step={{ current: 2, total: 5 }} title="Choose an age group" body="You never need to give your date of birth. This helps Hashie use age-appropriate language and safeguards.">
    <StatusMessage>No legal, consent, or parental-notification decision is made by this selection. Those policies need professional review.</StatusMessage>
    <View accessibilityRole="radiogroup" className="gap-3">{choices.map(choice => <ChoiceButton key={choice.value} {...choice} selected={profile.ageGroup === choice.value} onPress={() => void updateProfile({ ageGroup: choice.value })} />)}</View>
    <PrimaryButton label="Continue" hint="Save age group and continue to accessibility preferences" onPress={() => router.push('/accessibility')} />
    <SecondaryButton label="Back" hint="Return to language selection" onPress={() => goBackOrReplace('/language')} />
  </AuthScreen>;
}
