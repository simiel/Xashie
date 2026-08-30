import { router } from 'expo-router';
import { AuthScreen, PrimaryButton, StatusMessage } from '@/components/auth-screen';
export default function AuthRequiredScreen() { return <AuthScreen title="Sign-in required" body="This feature needs an account session. Your private health information is not shown until you sign in."><StatusMessage tone="warning">Guest users may have limited access to account-only features.</StatusMessage><PrimaryButton label="Choose sign-in" hint="Return to authentication choices" onPress={() => router.replace('/choice')} /></AuthScreen>; }
