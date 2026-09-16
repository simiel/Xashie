import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ChoiceCard, FeatureNotice } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { accessibilityOptions } from '@/constants/onboarding';
import { colors, fonts, spacing, textStyles } from '@/constants/design-system';

export default function AccessibilityScreen() {
  const { state, completeOnboarding, isConnecting, submissionError, toggleAccessibilityPreference } = useOnboarding();
  const finish = async () => {
    if (await completeOnboarding()) router.replace('/(tabs)');
  };
  return (
    <OnboardingScreen step={5} title="How can we make Hashie easier to use?" body="Choose any that would help. These preferences can be changed anytime in Profile and are saved to your active session." onContinue={finish} onSkip={finish} continueLabel={isConnecting ? 'Saving…' : 'Finish setup'} testID="finish-onboarding" canContinue={!isConnecting}>
      {accessibilityOptions.map((option) => {
        const selected = state.accessibilityPreferences.includes(option.value);
        return <ChoiceCard key={option.value} multi selected={selected} onPress={() => toggleAccessibilityPreference(option.value)} accessibilityLabel={option.label} testID={`accessibility-${option.value}`}><View style={{ alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.md, minWidth: 0 }}><Text style={{ color: colors.textPrimary, flexShrink: 0, fontFamily: fonts.bold, fontSize: option.symbol === 'Aa' ? 22 : 18, minWidth: 42 }} selectable>{option.symbol}</Text><Text style={[textStyles.bodyStrong, { flex: 1, flexShrink: 1 }]} selectable>{option.label}</Text></View></ChoiceCard>;
      })}
      {submissionError ? <FeatureNotice tone="blue"><Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} accessibilityRole="alert" selectable>{submissionError}</Text></FeatureNotice> : null}
      <FeatureNotice><Text style={[textStyles.bodyStrong, { color: colors.successText }]} selectable>Your choices help us support you.</Text><Text style={textStyles.body} selectable>Only the preferences you choose are sent to Hashie's backend for your active session.</Text></FeatureNotice>
    </OnboardingScreen>
  );
}
