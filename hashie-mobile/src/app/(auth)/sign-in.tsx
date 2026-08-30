import { useSSO } from '@clerk/expo';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { AuthScreen, PrimaryButton, SecondaryButton, StatusMessage } from '@/components/auth-screen';
import { resolveOAuthOutcome } from '@/auth/oauth';
import { goBackOrReplace } from '@/auth/navigation';

type OAuthState = 'idle' | 'loading' | 'cancelled' | 'failed';

export default function GoogleSignInScreen() {
  const { startSSOFlow } = useSSO();
  const [state, setState] = useState<OAuthState>('idle');
  const signInWithGoogle = async () => {
    setState('loading');
    try {
      const result = await startSSOFlow({ strategy: 'oauth_google', redirectUrl: Linking.createURL('oauth-callback') });
      const outcome = resolveOAuthOutcome(result.createdSessionId, result.authSessionResult);
      if (outcome === 'success' && result.createdSessionId && result.setActive) {
        await result.setActive({ session: result.createdSessionId });
        router.replace('/oauth-callback');
        return;
      }
      if (outcome === 'cancelled') { setState('cancelled'); return; }
      setState('failed');
    } catch { setState('failed'); }
  };
  return <AuthScreen eyebrow="Secure sign-in" title="Continue with Google" body="Hashie opens Google in a secure browser. Hashie never sees or stores your Google password.">
    {state === 'cancelled' ? <StatusMessage tone="warning">Google sign-in was cancelled. Nothing has changed; you can try again or choose another option.</StatusMessage> : null}
    {state === 'failed' ? <StatusMessage tone="error">We could not complete sign-in. Check your connection and try again. If this continues, Google sign-in may still need configuration in the Clerk Dashboard.</StatusMessage> : null}
    <PrimaryButton label={state === 'loading' ? 'Opening Google…' : 'Continue with Google'} hint="Open secure Google OAuth sign-in" loading={state === 'loading'} onPress={() => void signInWithGoogle()} />
    <SecondaryButton label="Back" hint="Return to authentication choices" disabled={state === 'loading'} onPress={() => goBackOrReplace('/choice')} />
  </AuthScreen>;
}
