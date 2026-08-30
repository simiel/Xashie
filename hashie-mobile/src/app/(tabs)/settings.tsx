import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { useAuthProfile } from '@/auth/auth-context';
import { PrimaryButton, SecondaryButton, StatusMessage } from '@/components/auth-screen';
import { ScrollView, Text, View } from '@/ui/primitives';

export default function SettingsScreen() {
  const { profile, sessionType, signOutAccount, endGuestSession } = useAuthProfile();
  const [busy, setBusy] = useState(false);
  const endSession = async () => { setBusy(true); try { if (sessionType === 'account') await signOutAccount(); else await endGuestSession(); router.replace('/welcome'); } finally { setBusy(false); } };
  return <><Stack.Screen options={{ title: 'Settings' }} /><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="mx-auto w-full max-w-2xl gap-5 px-5 py-6"><Text accessibilityRole="header" className="text-3xl font-bold text-slate-950 dark:text-white">Settings</Text><View className="gap-2 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><Text className="text-base font-semibold text-slate-950 dark:text-white">{sessionType === 'guest' ? 'Guest session' : 'Account session'}</Text><Text className="text-sm leading-5 text-slate-700 dark:text-slate-200">Language: {profile.language === 'en' ? 'English' : 'Akan/Twi'} · Age group: {profile.ageGroup.replaceAll('_', ' ')}</Text></View>{sessionType === 'guest' ? <StatusMessage tone="warning">Guest data remains separate from accounts and is limited to this device.</StatusMessage> : <StatusMessage>Sign out ends this device session. It does not delete your account or data.</StatusMessage>}<PrimaryButton label={sessionType === 'guest' ? 'End guest session' : 'Sign out'} hint={sessionType === 'guest' ? 'Clear the local guest session on this device' : 'End the current Clerk account session'} loading={busy} onPress={() => void endSession()} />{sessionType === 'account' ? <SecondaryButton label="Account and data deletion" hint="Learn how account deletion differs from signing out" onPress={() => router.push('/account-delete')} /> : null}</ScrollView></>;
}
