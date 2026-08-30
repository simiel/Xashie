import { Redirect } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import AppTabs from '@/components/app-tabs';
import { RouteLoading } from '@/components/route-loading';

export default function TabsLayout() {
  const { isReady, sessionType, profile, sessionExpired } = useAuthProfile();
  if (!isReady) return <RouteLoading />;
  if (sessionExpired) return <Redirect href="/session-expired" />;
  if (!sessionType) return <Redirect href="/welcome" />;
  if (!profile.completed) return <Redirect href="/language" />;
  return <AppTabs />;
}
