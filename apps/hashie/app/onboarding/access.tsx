import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { ActionButton, FeatureNotice } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { colors, spacing, textStyles } from '@/constants/design-system';

export default function AccessScreen() {
  const { setAccessChoice } = useOnboarding();
  const [notice, setNotice] = useState('');
  const continueAsGuest = () => {
    setNotice('');
    setAccessChoice('guest');
    router.push('/onboarding/language');
  };
  const continueWithGoogle = async () => {
    setAccessChoice('google');
    setNotice('Google sign-in is not connected to a Hashie account in this prototype. The official Google sign-in page will open, but Hashie will not be linked or signed in.');
    try {
      await WebBrowser.openBrowserAsync('https://accounts.google.com/ServiceLogin');
    } catch {
      setNotice('Google could not be opened. Hashie account linking is not connected in this prototype, and nothing was signed in.');
    }
  };

  return (
    <OnboardingScreen step={1} title="How would you like to begin?" body="Start privately as a guest, or open Google in your browser. Hashie account linking is not connected in this prototype." onContinue={continueAsGuest} hideNavigation>
      <View style={{ gap: spacing.sm }}>
        <ActionButton onPress={continueAsGuest} testID="continue-guest" accessibilityLabel="Continue as a guest">Continue as a guest  →</ActionButton>
        <ActionButton onPress={continueWithGoogle} variant="secondary" testID="continue-google" accessibilityLabel="Continue with Google">Continue with Google  ↗</ActionButton>
      </View>
      {notice ? <FeatureNotice tone="blue"><Text style={[textStyles.bodyStrong, { color: colors.textPrimary }]} accessibilityRole="alert" selectable>{notice}</Text></FeatureNotice> : null}
      <Text style={textStyles.caption} selectable>Guest access is private for this session. Google opens separately and cannot link a Hashie account yet.</Text>
    </OnboardingScreen>
  );
}
