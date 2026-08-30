import { router } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { AuthScreen, PrimaryButton, StatusMessage } from '@/components/auth-screen';
export default function SessionExpiredScreen() { const { clearSessionExpired } = useAuthProfile(); return <AuthScreen title="Your session ended" body="For your privacy, Hashie needs you to sign in again before showing account information."><StatusMessage tone="warning">No health question or account token is shown on this screen.</StatusMessage><PrimaryButton label="Sign in again" hint="Return to authentication choices" onPress={() => { clearSessionExpired(); router.replace('/choice'); }} /></AuthScreen>; }
