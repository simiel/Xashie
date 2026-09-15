import { useState } from 'react';
import { router } from 'expo-router';
import { Text } from 'react-native';

import { FeatureNotice, TextField } from '@/components/hashie-ui';
import { OnboardingScreen } from '@/components/onboarding-screen';
import { useOnboarding } from '@/components/onboarding-provider';
import { colors, textStyles } from '@/constants/design-system';

const nicknamePattern = /^[\p{L}][\p{L}\s'\-]{1,23}$/u;

export default function NicknameScreen() {
  const { state, setNickname } = useOnboarding();
  const [error, setError] = useState('');
  const continueToAge = () => {
    const value = state.nickname.trim();
    if (value && !nicknamePattern.test(value)) {
      setError('Use 2–24 letters, spaces, apostrophes, or hyphens.');
      return;
    }
    setError('');
    setNickname(value);
    router.push('/onboarding/age-group');
  };
  return (
    <OnboardingScreen step={3} title="What should Hashie call you?" body="A nickname can make the app feel more personal. It is optional, and you can change it later." onContinue={continueToAge} onSkip={() => { setError(''); setNickname(''); router.push('/onboarding/age-group'); }}>
      <TextField label="Your nickname (optional)" value={state.nickname} onChangeText={(value) => { setNickname(value); setError(''); }} placeholder="Type a nickname" error={error} maxLength={24} returnKeyType="done" testID="nickname-field" />
      <FeatureNotice><Text style={[textStyles.bodyStrong, { color: colors.successText }]} selectable>No legal name needed.</Text><Text style={textStyles.body} selectable>Only share a nickname if it feels helpful. It stays in memory for this session.</Text></FeatureNotice>
    </OnboardingScreen>
  );
}
