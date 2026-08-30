import { router } from 'expo-router';
import { useState } from 'react';
import { useAuthProfile } from '@/auth/auth-context';
import { goBackOrReplace } from '@/auth/navigation';
import { AuthScreen, PrimaryButton, SecondaryButton, StatusMessage } from '@/components/auth-screen';
import { SafetyNotice } from '@/components/safety-notice';
import { Text, View } from '@/ui/primitives';

export default function PrivacyOnboardingScreen() {
  const { profile, sessionType, updateProfile } = useAuthProfile();
  const [saving, setSaving] = useState(false);
  const finish = async () => { setSaving(true); try { await updateProfile({ completed: true }); router.replace('/home'); } finally { setSaving(false); } };
  return <AuthScreen step={{ current: 5, total: 5 }} title="Your privacy and safety" body="Please understand how Hashie supports you before you begin.">
    <View className="gap-3 rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><Text className="text-base font-semibold text-slate-950 dark:text-white">What Hashie can do</Text><Text className="text-sm leading-6 text-slate-700 dark:text-slate-200">Offer health education, help you prepare questions, and guide you toward human support.</Text><Text className="text-base font-semibold text-slate-950 dark:text-white">What Hashie cannot do</Text><Text className="text-sm leading-6 text-slate-700 dark:text-slate-200">Diagnose, prescribe, replace a clinician, or act as an emergency service.</Text></View>
    <SafetyNotice language={profile.language} />
    <StatusMessage tone="warning">{sessionType === 'guest' ? 'Guest preferences are kept only on this device. They can be cleared by ending the guest session.' : 'Your account session is protected by Clerk. Hashie preferences are stored separately from your identity. Account deletion is separate from sign-out.'} Audio and transcript retention must be explained by the API before voice features are enabled.</StatusMessage>
    <PrimaryButton label="Finish setup" hint="Save onboarding and enter Hashie" loading={saving} onPress={() => void finish()} />
    <SecondaryButton label="Back" hint="Return to preferences" disabled={saving} onPress={() => goBackOrReplace('/profile')} />
  </AuthScreen>;
}
