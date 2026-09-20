import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ActionButton, FeatureNotice, HashieLogo, ScreenScroll } from '@/components/hashie-ui';
import { useOnboarding } from '@/components/onboarding-provider';
import { ageGroupOptions, accessibilityOptions } from '@/constants/onboarding';
import { colors, spacing, surfaces, textStyles } from '@/constants/design-system';

export default function ProfileScreen() {
  const {
    actor,
    hasGuestUpgradeAvailable,
    isConnecting,
    resetGuestSession,
    sessionError,
    sessionStatus,
    signOutAccount,
    startPreferencesEdit,
    state,
  } = useOnboarding();
  const [confirmGuestReset, setConfirmGuestReset] = useState(false);
  const ageGroup = ageGroupOptions.find((option) => option.value === state.ageGroup)?.label ?? 'Not shared';
  const accessibility = state.accessibilityPreferences.length
    ? accessibilityOptions.filter((option) => state.accessibilityPreferences.includes(option.value)).map((option) => option.label).join(', ')
    : 'No choices yet';

  const editPreferences = () => {
    startPreferencesEdit();
    router.push('/onboarding/language');
  };

  const resetGuest = async () => {
    if (!confirmGuestReset) {
      setConfirmGuestReset(true);
      return;
    }
    await resetGuestSession();
    router.replace('/onboarding/access');
  };

  const switchAccount = async () => {
    if (await signOutAccount()) router.replace('/onboarding/access');
  };

  if (sessionStatus === 'loading') {
    return <ScreenScroll contentContainerStyle={{ flexGrow: 1, gap: spacing.lg, justifyContent: 'center' }}><Stack.Screen options={{ title: 'Profile' }} /><ActivityIndicator accessibilityLabel="Restoring your profile" color={colors.focus} /><Text accessibilityLiveRegion="polite" style={[textStyles.body, { textAlign: 'center' }]}>Restoring your private choices…</Text></ScreenScroll>;
  }

  if (!actor) {
    return <ScreenScroll contentContainerStyle={{ flexGrow: 1, gap: spacing.lg, justifyContent: 'center' }}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <View style={{ ...surfaces.card, gap: spacing.md, padding: spacing.lg }}>
        <HashieLogo compact />
        <Text style={textStyles.heading1} selectable>No active private session</Text>
        <Text style={textStyles.body} selectable>{sessionError || 'Choose a guest session or sign in with Google to save and review preferences.'}</Text>
        <ActionButton onPress={() => router.push('/onboarding/access')} accessibilityLabel="Choose a private session">Choose a private session</ActionButton>
      </View>
    </ScreenScroll>;
  }

  return (
    <ScreenScroll contentContainerStyle={{ gap: spacing.lg }}>
      <Stack.Screen options={{ title: 'Profile' }} />
      <View style={{ alignItems: 'center', gap: spacing.sm }}><HashieLogo compact /><Text style={textStyles.heading1} selectable>Your choices</Text><Text style={textStyles.body} selectable>Review or change the preferences saved for this {actor.type === 'guest' ? 'private guest session' : 'signed-in account'}.</Text></View>
      <View style={{ ...surfaces.card, gap: spacing.md, padding: spacing.lg }}>
        <SummaryRow label="Access" value={actor.type === 'guest' ? 'Guest session' : 'Google account'} />
        <SummaryRow label="Language" value={state.language === 'akan-twi' ? 'Akan / Twi' : 'English'} />
        <SummaryRow label="Nickname" value={state.nickname.trim() || 'Not shared'} />
        <SummaryRow label="Broad age group" value={ageGroup} />
        <SummaryRow label="Accessibility" value={accessibility} />
        <ActionButton onPress={editPreferences} variant="secondary" accessibilityLabel="Edit saved preferences">Edit saved choices</ActionButton>
      </View>
      {actor.type === 'clerk-user' && hasGuestUpgradeAvailable ? <FeatureNotice tone="blue">
        <Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} selectable>A guest session is ready for your review</Text>
        <Text style={textStyles.body} selectable>You can explicitly choose whether to move its saved preferences into this account. Chat messages are not saved or moved.</Text>
        <ActionButton onPress={() => router.push('/onboarding/upgrade')} variant="secondary" accessibilityLabel="Review guest preference transfer">Review guest preference transfer</ActionButton>
      </FeatureNotice> : null}
      {actor.type === 'guest' ? <FeatureNotice>
        <Text style={[textStyles.bodyStrong, { color: colors.successText }]} selectable>End this guest session</Text>
        <Text style={textStyles.body} selectable>Clearing it removes the private session from this device. The backend will no longer receive this guest token; its short-lived record expires automatically.</Text>
        <ActionButton onPress={resetGuest} disabled={isConnecting} variant={confirmGuestReset ? 'secondary' : 'text'} accessibilityLabel={confirmGuestReset ? 'Confirm clearing guest session from this device' : 'Clear guest session from this device'}>{confirmGuestReset ? 'Confirm clear guest session' : 'Clear guest session from this device'}</ActionButton>
      </FeatureNotice> : <FeatureNotice>
        <Text style={[textStyles.bodyStrong, { color: colors.successText }]} selectable>Switch accounts</Text>
        <Text style={textStyles.body} selectable>Sign out before using a different Google account on this device. Hashie does not show session tokens or account credentials.</Text>
        <ActionButton onPress={switchAccount} disabled={isConnecting} variant="secondary" accessibilityLabel="Sign out and use another account">{isConnecting ? 'Signing out…' : 'Sign out / use another account'}</ActionButton>
      </FeatureNotice>}
      {sessionError ? <FeatureNotice tone="blue"><Text accessibilityRole="alert" selectable style={[textStyles.bodyStrong, { color: colors.textPrimary }]}>{sessionError}</Text></FeatureNotice> : null}
    </ScreenScroll>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <View style={{ borderBottomColor: colors.border, borderBottomWidth: 1, gap: spacing.xs, paddingBottom: spacing.sm }}><Text style={textStyles.caption} selectable>{label}</Text><Text style={textStyles.bodyStrong} selectable>{value}</Text></View>;
}
