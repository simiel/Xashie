import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useSSO } from '@clerk/expo';

import { ActionButton, FeatureNotice } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { colors, spacing, textStyles } from '@/constants/design-system';

export default function AccessScreen() {
  const { beginGuestSession, clearSubmissionError, isConnecting, setAccessChoice, submissionError } = useOnboarding();
  const { startSSOFlow } = useSSO();
  const [notice, setNotice] = useState('');
  const continueAsGuest = async () => {
    setNotice('');
    clearSubmissionError();
    try {
      await beginGuestSession();
      router.push('/onboarding/language');
    } catch {
      // The provider has already set a safe, retryable message.
    }
  };
  const continueWithGoogle = async () => {
    setNotice('');
    clearSubmissionError();
    try {
      const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({ strategy: 'oauth_google' });
      if (authSessionResult?.type !== 'success') return;
      if (!createdSessionId || !setActive) {
        setNotice('Google sign-in did not finish. You can try again or continue as a guest.');
        return;
      }
      await setActive({ session: createdSessionId });
      setAccessChoice('google');
      router.push('/onboarding/language');
    } catch {
      setNotice('Google sign-in could not be completed. You can try again or continue as a guest.');
    }
  };

  return (
    <OnboardingScreen step={1} title="How would you like to begin?" body="Start privately as a guest, or sign in with Google to keep your preferences with your Hashie account." onContinue={continueAsGuest} hideNavigation>
      <View style={{ gap: spacing.sm }}>
        <ActionButton onPress={continueAsGuest} disabled={isConnecting} testID="continue-guest" accessibilityLabel="Continue as a guest">{isConnecting ? 'Connecting…' : 'Continue as a guest  →'}</ActionButton>
        <ActionButton onPress={continueWithGoogle} disabled={isConnecting} variant="secondary" testID="continue-google" accessibilityLabel="Continue with Google">Continue with Google  ↗</ActionButton>
      </View>
      {notice || submissionError ? <FeatureNotice tone="blue"><Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} accessibilityRole="alert" selectable>{notice || submissionError}</Text></FeatureNotice> : null}
      <Text style={textStyles.caption} selectable>Guest access is private for this session. Google sign-in is handled securely by Clerk.</Text>
    </OnboardingScreen>
  );
}
