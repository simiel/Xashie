import { router } from 'expo-router';
import { Text } from 'react-native';

import { ChoiceCard, FeatureNotice } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { colors, textStyles } from '@/constants/design-system';

export default function LanguageScreen() {
  const { state, setLanguage } = useOnboarding();
  return (
    <OnboardingScreen step={2} title="What language feels best for you?" body="Choosing a language helps Hashie communicate more clearly. You can change this later in Profile." onContinue={() => router.push('/onboarding/nickname')} onSkip={() => router.push('/onboarding/nickname')}>
      <ChoiceCard selected={state.language === 'english'} onPress={() => setLanguage('english')} accessibilityLabel="English" testID="language-english"><Text style={textStyles.heading2} selectable>English</Text><Text style={textStyles.body} selectable>Hear an example · audio is not connected</Text></ChoiceCard>
      <ChoiceCard selected={state.language === 'akan-twi'} onPress={() => setLanguage('akan-twi')} accessibilityLabel="Akan or Twi" testID="language-akan-twi"><Text style={textStyles.heading2} selectable>Akan / Twi</Text><Text style={textStyles.body} selectable>Hear an example · audio is not connected</Text></ChoiceCard>
      <FeatureNotice tone="blue"><Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} selectable>Language preference</Text><Text style={textStyles.body} selectable>This only guides the future experience in this local prototype; it is not sent anywhere.</Text></FeatureNotice>
    </OnboardingScreen>
  );
}
