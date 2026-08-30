import { router } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { goBackOrReplace } from '@/auth/navigation';
import { AuthScreen, ChoiceButton, PrimaryButton, SecondaryButton } from '@/components/auth-screen';
import { View } from '@/ui/primitives';

export default function LanguageOnboardingScreen() {
  const { profile, updateProfile } = useAuthProfile();
  return <AuthScreen step={{ current: 1, total: 5 }} title="Choose your language" body="You can change this later. Hashie carries this preference with your chat and voice requests.">
    <View accessibilityRole="radiogroup" className="gap-3">
      <ChoiceButton label="English" hint="Health information in English." selected={profile.language === 'en'} onPress={() => void updateProfile({ language: 'en' })} />
      <ChoiceButton label="Akan/Twi" hint="Choose Akan/Twi where reviewed content and support are available." selected={profile.language === 'tw'} onPress={() => void updateProfile({ language: 'tw' })} />
    </View>
    <PrimaryButton label="Continue" hint="Save language and continue to age group" onPress={() => router.push('/age')} />
    <SecondaryButton label="Back" hint="Return to authentication choices" onPress={() => goBackOrReplace('/choice')} />
  </AuthScreen>;
}
