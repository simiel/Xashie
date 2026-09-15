import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ChoiceCard, FeatureNotice } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { accessibilityOptions } from '@/constants/onboarding';
import { colors, fonts, spacing, textStyles } from '@/constants/design-system';

export default function AccessibilityScreen() {
  const { state, toggleAccessibilityPreference } = useOnboarding();
  const finish = () => router.replace('/(tabs)');
  return (
    <OnboardingScreen step={5} title="How can we make Hashie easier to use?" body="Choose any that would help. These preferences can be changed anytime in Profile and are kept in memory for this session." onContinue={finish} onSkip={finish} continueLabel="Finish setup" testID="finish-onboarding">
      {accessibilityOptions.map((option) => {
        const selected = state.accessibilityPreferences.includes(option.value);
        return <ChoiceCard key={option.value} multi selected={selected} onPress={() => toggleAccessibilityPreference(option.value)} accessibilityLabel={option.label} testID={`accessibility-${option.value}`}><View style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.md, minWidth: 0 }}><Text style={{ color: colors.textPrimary, flexShrink: 0, fontFamily: fonts.bold, fontSize: option.symbol === 'Aa' ? 22 : 18, minWidth: 42 }} selectable>{option.symbol}</Text><Text style={[textStyles.bodyStrong, { flex: 1, flexShrink: 1 }]} selectable>{option.label}</Text></View></ChoiceCard>;
      })}
      <FeatureNotice><Text style={[textStyles.bodyStrong, { color: colors.successText }]} selectable>Your choices help us support you.</Text><Text style={textStyles.body} selectable>They only shape the local presentation in this prototype. No network, storage, analytics, or providers are involved.</Text></FeatureNotice>
    </OnboardingScreen>
  );
}
