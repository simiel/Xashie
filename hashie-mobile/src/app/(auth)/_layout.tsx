import { Redirect, Stack } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { resolveInitialRoute } from '@/auth/routing';
import { RouteLoading } from '@/components/route-loading';

export default function AuthLayout() {
  const { isReady, sessionType, profile, sessionExpired } = useAuthProfile();
  if (!isReady) return <RouteLoading />;
  const route = resolveInitialRoute({ isReady, sessionType, onboardingComplete: profile.completed, sessionExpired });
  if (sessionType || sessionExpired) return <Redirect href={route ?? '/welcome'} />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
