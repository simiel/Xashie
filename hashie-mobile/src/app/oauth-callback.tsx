import { Redirect } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { resolveInitialRoute } from '@/auth/routing';
import { RouteLoading } from '@/components/route-loading';

export default function OAuthCallback() {
  const { isReady, sessionType, profile, sessionExpired } = useAuthProfile();
  const route = resolveInitialRoute({ isReady, sessionType, onboardingComplete: profile.completed, sessionExpired });
  return route ? <Redirect href={route} /> : <RouteLoading label="Completing sign-in securely…" />;
}
