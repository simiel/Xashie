import { router, Stack } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionButton, FeatureNotice, HashieLogo, ScreenScroll } from '@/components/hashie-ui';
import { useOnboarding } from '@/components/onboarding-provider';
import { ageGroupOptions, accessibilityOptions } from '@/constants/onboarding';
import { colors, spacing, surfaces, textStyles } from '@/constants/design-system';

export default function ProfileScreen() {
  const { state } = useOnboarding();
  const ageGroup = ageGroupOptions.find((option) => option.value === state.ageGroup)?.label ?? 'Not shared';
  const accessibility = state.accessibilityPreferences.length
    ? accessibilityOptions.filter((option) => state.accessibilityPreferences.includes(option.value)).map((option) => option.label).join(', ')
    : 'No choices yet';

  return (
    <ScreenScroll contentContainerStyle={{ gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <View style={{ alignItems: 'center', gap: spacing.sm }}><HashieLogo compact /><Text style={textStyles.heading1} selectable>Your choices</Text><Text style={textStyles.body} selectable>Review or change the preferences you shared for this session.</Text></View>
      <View style={{ ...surfaces.card, gap: spacing.md, padding: spacing.lg }}>
        <SummaryRow label="Access" value={state.accessChoice === 'guest' ? 'Guest' : 'Not connected'} />
        <SummaryRow label="Language" value={state.language === 'akan-twi' ? 'Akan / Twi' : 'English'} />
        <SummaryRow label="Nickname" value={state.nickname.trim() || 'Not shared'} />
        <SummaryRow label="Broad age group" value={ageGroup} />
        <SummaryRow label="Accessibility" value={accessibility} />
        <ActionButton onPress={() => router.push('/onboarding/access')} variant="secondary" accessibilityLabel="Review onboarding choices">Review choices</ActionButton>
      </View>
      <FeatureNotice>
        <Text style={[textStyles.bodyStrong, { color: colors.successText }]} selectable>Session-only prototype</Text>
        <Text style={textStyles.body} selectable>Your choices are held in memory on this device for this session. They are not saved, logged, sent to providers, or used for analytics in this slice.</Text>
      </FeatureNotice>
    </ScreenScroll>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={{ borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.xs, paddingBottom: spacing.sm }}><Text style={textStyles.caption} selectable>{label}</Text><Text style={textStyles.bodyStrong} selectable>{value}</Text></View>;
}
