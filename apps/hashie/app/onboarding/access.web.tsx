import { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '@clerk/expo';
import { router } from 'expo-router';

import { ActionButton, FeatureNotice } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { colors, spacing, textStyles } from '@/constants/design-system';
import { destinationAfterSignedInActivation } from '@/lib/post-google-sign-in';

export default function WebAccessScreen() {
  const {
    activateSignedInActor,
    beginGuestSession,
    clearSubmissionError,
    isConnecting,
    sessionError,
    submissionError,
  } = useOnboarding();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  const [isActivatingAccount, setIsActivatingAccount] = useState(false);
  const hasActivatedAccount = useRef(false);
  const isSubmitting = isConnecting || isActivatingAccount;

  const activateGoogleSession = useCallback(async () => {
    if (hasActivatedAccount.current) return;
    hasActivatedAccount.current = true;
    setIsActivatingAccount(true);
    try {
      const result = await activateSignedInActor();
      const destination = destinationAfterSignedInActivation(result);
      router.replace(destination === 'upgrade'
        ? '/onboarding/upgrade'
        : destination === 'tabs'
          ? '/(tabs)'
          : '/onboarding/language');
    } catch {
      hasActivatedAccount.current = false;
    } finally {
      setIsActivatingAccount(false);
    }
  }, [activateSignedInActor]);

  useEffect(() => {
    if (isClerkLoaded && isSignedIn) void activateGoogleSession();
  }, [activateGoogleSession, isClerkLoaded, isSignedIn]);

  const continueAsGuest = async () => {
    clearSubmissionError();
    try {
      const result = await beginGuestSession();
      router.replace(result.hasSavedPreferences ? '/(tabs)' : '/onboarding/language');
    } catch {
      // The provider has already set a safe, retryable message.
    }
  };

  return (
    <OnboardingScreen step={1} title="How would you like to begin?" body="Start privately as a guest, or sign in with Google to keep your preferences with your Hashie account." onContinue={continueAsGuest} hideNavigation>
      <View style={{ gap: spacing.sm }}>
        <ActionButton onPress={continueAsGuest} disabled={isSubmitting} testID="continue-guest" accessibilityLabel="Continue as a guest">{isConnecting ? 'Connecting…' : 'Continue as a guest  →'}</ActionButton>
        <ActionButton onPress={() => router.push('./sign-in')} disabled={isSubmitting || !isClerkLoaded} variant="secondary" testID="continue-google" accessibilityLabel="Continue with Google">{isActivatingAccount ? 'Connecting…' : 'Continue with Google  ↗'}</ActionButton>
      </View>
      {submissionError || sessionError ? <FeatureNotice tone="blue"><Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} accessibilityRole="alert" selectable>{submissionError || sessionError}</Text></FeatureNotice> : null}
      <Text style={textStyles.caption} selectable>Guest access is private for this session. Google sign-in is handled securely by Clerk.</Text>
    </OnboardingScreen>
  );
}
