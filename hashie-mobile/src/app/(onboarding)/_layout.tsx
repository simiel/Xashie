import { Redirect, Stack } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { RouteLoading } from '@/components/route-loading';

export default function OnboardingLayout() {
  const { isReady, sessionType, profile, sessionExpired } = useAuthProfile();
  if (!isReady) return <RouteLoading />;
  if (sessionExpired) return <Redirect href="/session-expired" />;
  if (!sessionType) return <Redirect href="/welcome" />;
  if (profile.completed) return <Redirect href="/home" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
