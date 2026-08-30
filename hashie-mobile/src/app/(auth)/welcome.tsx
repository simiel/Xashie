import { router } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { AuthScreen, ChoiceButton, PrimaryButton, StatusMessage } from '@/components/auth-screen';
import { SafetyNotice } from '@/components/safety-notice';
import { copy } from '@/content/copy';
import { View } from '@/ui/primitives';

export default function WelcomeScreen() {
  const { profile, updateProfile } = useAuthProfile();
  const text = copy[profile.language];
  return <AuthScreen eyebrow="Welcome to Hashie" title={text.welcomeTitle} body={text.welcomeBody}>
    <View accessibilityRole="radiogroup" className="gap-3">
      <ChoiceButton label="English" hint="Use Hashie in English." selected={profile.language === 'en'} onPress={() => void updateProfile({ language: 'en' })} />
      <ChoiceButton label="Akan/Twi" hint="Use the Akan/Twi language setting. Content availability may vary while it is reviewed." selected={profile.language === 'tw'} onPress={() => void updateProfile({ language: 'tw' })} />
    </View>
    <SafetyNotice language={profile.language} />
    <StatusMessage>Choose how to continue next. You remain in control of what you share, and can use guest mode when it is available.</StatusMessage>
    <PrimaryButton label="Continue" hint="Continue to sign-in choices" onPress={() => router.push('/choice')} />
  </AuthScreen>;
}
