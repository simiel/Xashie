import { router } from 'expo-router';
import { useState } from 'react';
import { useAuthProfile } from '@/auth/auth-context';
import { goBackOrReplace } from '@/auth/navigation';
import { AuthScreen, PrimaryButton, SecondaryButton, StatusMessage } from '@/components/auth-screen';
import { View } from '@/ui/primitives';

export default function AuthenticationChoiceScreen() {
  const { guestModeEnabled, startGuestSession } = useAuthProfile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const continueAsGuest = async () => {
    setBusy(true); setError(null);
    try { await startGuestSession(); router.replace('/language'); }
    catch { setError('Guest mode could not start. Please try again.'); }
    finally { setBusy(false); }
  };
  return <AuthScreen eyebrow="Your choice" title="How would you like to continue?" body="A Google account lets you restore your session. Guest mode keeps a separate, limited session on this device.">
    {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
    <View className="gap-3">
      <PrimaryButton label="Continue with Google" hint="Open Google sign-in in a secure browser" onPress={() => router.push('/sign-in')} />
      {guestModeEnabled ? <SecondaryButton label="Continue as guest" hint="Start a limited guest session on this device" disabled={busy} onPress={() => void continueAsGuest()} /> : null}
    </View>
    <StatusMessage tone="warning">Guest sessions cannot access account-only features. Do not rely on guest mode for information you need to restore on another device.</StatusMessage>
    <SecondaryButton label="Back" hint="Return to the welcome screen" onPress={() => goBackOrReplace('/welcome')} />
  </AuthScreen>;
}
