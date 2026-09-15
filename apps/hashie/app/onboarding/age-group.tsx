import { router } from 'expo-router';
import { Text } from 'react-native';

import { ChoiceCard } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { ageGroupOptions } from '@/constants/onboarding';
import { textStyles } from '@/constants/design-system';

export default function AgeGroupScreen() {
  const { state, setAgeGroup } = useOnboarding();
  return (
    <OnboardingScreen step={4} title="Which broad age group are you in?" body="This helps a future Hashie experience use age-appropriate language and safeguards. You can skip this." onContinue={() => router.push('/onboarding/accessibility')} onSkip={() => router.push('/onboarding/accessibility')}>
      {ageGroupOptions.map((option) => <ChoiceCard key={option.value} selected={state.ageGroup === option.value} onPress={() => setAgeGroup(option.value)} accessibilityLabel={option.label} testID={`age-${option.value}`}><Text style={textStyles.bodyStrong} selectable>{option.label}</Text></ChoiceCard>)}
    </OnboardingScreen>
  );
}
