import { Redirect, router } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { goBackOrReplace } from '@/auth/navigation';
import { AuthScreen, PrimaryButton, SecondaryButton, StatusMessage } from '@/components/auth-screen';

export default function AccountDeletionEntry() {
  const { sessionType } = useAuthProfile();
  if (sessionType !== 'account') return <Redirect href="/auth-required" />;
  return <AuthScreen title="Account and data deletion" body="Signing out and deleting your account are different actions."><StatusMessage tone="warning">Account deletion must be confirmed through the secure backend so it can also handle Hashie data retention and deletion rules. This mobile build does not claim to delete account or health data locally.</StatusMessage><PrimaryButton label="Request deletion support" hint="Return to support while deletion service is being configured" onPress={() => router.replace('/support')} /><SecondaryButton label="Keep my account" hint="Return to settings without deleting anything" onPress={() => goBackOrReplace('/settings')} /></AuthScreen>;
}
