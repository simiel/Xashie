import { useState } from 'react';
import { router } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { useAuth, useSSO } from '@clerk/expo';
import { useSignInWithGoogle } from '@clerk/expo/google';

import { ActionButton, FeatureNotice } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { colors, spacing, textStyles } from '@/constants/design-system';

export default function AccessScreen() {
  const {
    activateSignedInActor,
    actor,
    beginGuestSession,
    clearSubmissionError,
    isConnecting,
    sessionError,
    sessionRecovery,
    signOutAccount,
    submissionError,
  } = useOnboarding();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const { startGoogleAuthenticationFlow } = useSignInWithGoogle();
  const [notice, setNotice] = useState('');
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const isSubmitting = isConnecting || isGoogleConnecting;
  const continueAsGuest = async () => {
    setNotice('');
    clearSubmissionError();
    try {
      const result = await beginGuestSession();
      router.replace(result.hasSavedPreferences ? '/(tabs)' : '/onboarding/language');
    } catch {
      // The provider has already set a safe, retryable message.
    }
  };
  const continueWithGoogle = async () => {
    setNotice('');
    clearSubmissionError();
    if (!isClerkLoaded) {
      setNotice('Sign-in is still getting ready. Check your connection and try again.');
      return;
    }
    setIsGoogleConnecting(true);
    try {
      const continueWithGoogleBrowser = async () => {
        const { createdSessionId, setActive, authSessionResult } = await startSSOFlow({
          strategy: 'oauth_google',
        });
        if (!authSessionResult) {
          setNotice('Google sign-in could not be started. Please try again.');
          return false;
        }
        if (authSessionResult.type !== 'success') {
          setNotice(authSessionResult.type === 'cancel'
            ? 'Google sign-in was canceled. You can try again or continue as a guest.'
            : 'Google sign-in could not be completed. You can try again or continue as a guest.');
          return false;
        }
        if (!createdSessionId || !setActive) {
          setNotice('Google sign-in did not finish. You can try again or continue as a guest.');
          return false;
        }
        await setActive({ session: createdSessionId });
        return true;
      };
      const needsFreshGoogleSignIn = !isSignedIn || sessionRecovery === 'clerk-expired';
      if (sessionRecovery === 'clerk-expired' && isSignedIn && !(await signOutAccount())) {
        setNotice('Please finish signing out before trying another Google sign-in.');
        return;
      }
      if (needsFreshGoogleSignIn) {
        if (Platform.OS === 'android') {
          try {
            const { createdSessionId, setActive } = await startGoogleAuthenticationFlow();
            // A provider can resolve without a session when Credential Manager has no
            // usable credential. Give the user Clerk's browser flow as a recovery path.
            if (!createdSessionId) {
              const browserSignedIn = await continueWithGoogleBrowser();
              if (!browserSignedIn) return;
            } else {
              if (!setActive) {
                setNotice('Google sign-in did not finish. You can try again or continue as a guest.');
                return;
              }
              await setActive({ session: createdSessionId });
            }
          } catch {
            // Credential Manager can reject before rendering its chooser when the phone has no
            // usable saved credential or the provider is temporarily unavailable. Fall back to
            // Clerk's browser flow so the user still has an explicit, recoverable path.
            const browserSignedIn = await continueWithGoogleBrowser();
            if (!browserSignedIn) return;
          }
        } else {
          // Keep the existing browser-based Clerk flow on iOS and web.
          const browserSignedIn = await continueWithGoogleBrowser();
          if (!browserSignedIn) return;
        }
      }
      const result = await activateSignedInActor();
      const shouldOfferUpgrade = result.guestUpgradeAvailable && actor?.type === 'guest';
      router.replace(shouldOfferUpgrade ? '/onboarding/upgrade' : result.hasSavedPreferences ? '/(tabs)' : '/onboarding/language');
    } catch {
      setNotice(sessionRecovery === 'clerk-expired'
        ? 'This account needs to sign out and sign in again before it can be used.'
        : 'Google sign-in could not be completed. You can try again or continue as a guest.');
    } finally {
      setIsGoogleConnecting(false);
    }
  };

  return (
    <OnboardingScreen step={1} title="How would you like to begin?" body="Start privately as a guest, or sign in with Google to keep your preferences with your Hashie account." onContinue={continueAsGuest} hideNavigation>
      <View style={{ gap: spacing.sm }}>
        <ActionButton onPress={continueAsGuest} disabled={isSubmitting} testID="continue-guest" accessibilityLabel="Continue as a guest">{isConnecting ? 'Connecting…' : 'Continue as a guest  →'}</ActionButton>
        <ActionButton onPress={continueWithGoogle} disabled={isSubmitting} variant="secondary" testID="continue-google" accessibilityLabel="Continue with Google">{isGoogleConnecting ? 'Connecting…' : 'Continue with Google  ↗'}</ActionButton>
      </View>
      {notice || submissionError || sessionError ? <FeatureNotice tone="blue"><Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} accessibilityRole="alert" selectable>{notice || submissionError || sessionError}</Text></FeatureNotice> : null}
      <Text style={textStyles.caption} selectable>Guest access is private for this session. Google sign-in is handled securely by Clerk.</Text>
    </OnboardingScreen>
  );
}
