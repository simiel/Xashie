import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { ChoiceCard, FeatureNotice } from '@/components/hashie-ui';
import { useOnboarding } from '@/components/onboarding-provider';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { colors, textStyles } from '@/constants/design-system';

export default function UpgradeGuestSessionScreen() {
  const {
    clearSubmissionError,
    hasGuestUpgradeAvailable,
    isConnecting,
    submissionError,
    upgradeGuestSession,
  } = useOnboarding();
  const [consent, setConsent] = useState(false);

  const continueWithConsent = async () => {
    clearSubmissionError();
    if (await upgradeGuestSession(consent)) router.replace('/profile');
  };

  return (
    <OnboardingScreen
      step={5}
      title="Move your guest choices?"
      body="You are signed in. You can choose whether to move the preferences from your private guest session into this account."
      onContinue={continueWithConsent}
      continueLabel={isConnecting ? 'Moving choices…' : 'I agree — move my choices'}
      canContinue={hasGuestUpgradeAvailable && consent && !isConnecting}
      onSkip={() => router.replace('/profile')}
      skipLabel="Keep them separate for now"
    >
      <ChoiceCard multi selected={consent} onPress={() => setConsent((value) => !value)} accessibilityLabel="I understand and agree to move my guest preferences">
        <Text style={textStyles.bodyStrong} selectable>Only your saved preferences will move</Text>
        <Text style={textStyles.body} selectable>Chat messages are not saved or moved. If this account already has choices, its language, nickname, and age group stay when present; accessibility choices are combined without duplicates.</Text>
      </ChoiceCard>
      <FeatureNotice tone="blue">
        <Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} selectable>Your consent is required</Text>
        <Text style={textStyles.body} selectable>Choosing “I agree” ends the guest session on this device after the backend confirms the transfer. You can keep the sessions separate instead.</Text>
      </FeatureNotice>
      {submissionError ? <FeatureNotice tone="blue"><Text accessibilityRole="alert" selectable style={[textStyles.bodyStrong, { color: colors.textPrimary }]}>{submissionError}</Text></FeatureNotice> : null}
    </OnboardingScreen>
  );
}
