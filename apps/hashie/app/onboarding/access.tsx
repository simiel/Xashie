import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { useAuth, useSSO } from '@clerk/expo';

import { ActionButton, FeatureNotice } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { useNativeGoogleSignIn } from '@/components/use-native-google-sign-in';
import { colors, spacing, textStyles } from '@/constants/design-system';
import { classifyNativeGoogleSignInError } from '@/lib/google-sign-in';
import { postGoogleSignInAction } from '@/lib/post-google-sign-in';

export default function AccessScreen() {
  const {
    actor,
    beginGuestSession,
    clearSubmissionError,
    hasGuestUpgradeAvailable,
    hasSavedPreferences,
    isConnecting,
    refreshSession,
    sessionError,
    sessionRecovery,
    sessionStatus,
    signOutAccount,
    submissionError,
  } = useOnboarding();
  const { isLoaded: isClerkLoaded, isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const { startNativeGoogleSignIn } = useNativeGoogleSignIn();
  const [notice, setNotice] = useState('');
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);
  const [isAwaitingSessionActivation, setIsAwaitingSessionActivation] = useState(false);
  const isSubmitting = isConnecting || isGoogleConnecting || isAwaitingSessionActivation;

  useEffect(() => {
    if (!isAwaitingSessionActivation) return;
    const action = postGoogleSignInAction({
      isClerkLoaded,
      isSignedIn: isSignedIn === true,
      sessionStatus,
      sessionRecovery,
      actorType: actor?.type ?? null,
      hasSavedPreferences,
      hasGuestUpgradeAvailable,
    });
    if (action.type === 'wait') return;
    setIsAwaitingSessionActivation(false);
    if (action.type === 'error') {
      setNotice(sessionError || 'Your signed-in session could not be activated. Please try again.');
      return;
    }
    router.replace(action.destination === 'upgrade'
      ? '/onboarding/upgrade'
      : action.destination === 'tabs'
        ? '/(tabs)'
        : '/onboarding/language');
  }, [actor?.type, hasGuestUpgradeAvailable, hasSavedPreferences, isAwaitingSessionActivation, isClerkLoaded, isSignedIn, sessionError, sessionRecovery, sessionStatus]);
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
          if (authSessionResult.type !== 'cancel') {
            setNotice('Google sign-in could not be completed. You can try again or continue as a guest.');
          }
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
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          try {
            const { createdSessionId, setActive } = await startNativeGoogleSignIn();
            if (!createdSessionId) {
              // Clerk returns no session when the native picker is cancelled. Do not
              // turn this into browser SSO or an error state.
              return;
            }
            if (!setActive) {
              setNotice('Google sign-in did not finish. You can try again or continue as a guest.');
              return;
            }
            await setActive({ session: createdSessionId });
          } catch (error) {
            const issue = classifyNativeGoogleSignInError(error);
            if (__DEV__ && issue.kind !== 'cancelled') {
              console.info('[Hashie auth] Native Google sign-in failed', { code: issue.diagnosticCode });
            }
            if (issue.notice) setNotice(issue.notice);
            return;
          }
        } else if (Platform.OS === 'web') {
          const browserSignedIn = await continueWithGoogleBrowser();
          if (!browserSignedIn) return;
        } else {
          setNotice('Google sign-in is not supported on this platform. Please continue as a guest.');
          return;
        }
        // `setActive` updates Clerk outside this render. Wait for OnboardingProvider's
        // Clerk-state effect to observe the new session before requesting the backend actor.
        setIsAwaitingSessionActivation(true);
        return;
      }
      setIsAwaitingSessionActivation(true);
      await refreshSession();
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
        <ActionButton onPress={continueWithGoogle} disabled={isSubmitting} variant="secondary" testID="continue-google" accessibilityLabel="Continue with Google">{isGoogleConnecting || isAwaitingSessionActivation ? 'Connecting…' : 'Continue with Google  ↗'}</ActionButton>
      </View>
      {notice || submissionError || sessionError ? <FeatureNotice tone="blue"><Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} accessibilityRole="alert" selectable>{notice || submissionError || sessionError}</Text></FeatureNotice> : null}
      <Text style={textStyles.caption} selectable>Guest access is private for this session. Google sign-in is handled securely by Clerk.</Text>
    </OnboardingScreen>
  );
}
