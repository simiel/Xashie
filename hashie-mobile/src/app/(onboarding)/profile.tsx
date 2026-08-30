import { router } from 'expo-router';
import { useState } from 'react';
import { useAuthProfile } from '@/auth/auth-context';
import { goBackOrReplace } from '@/auth/navigation';
import { AuthScreen, ChoiceButton, PrimaryButton, SecondaryButton, StatusMessage } from '@/components/auth-screen';
import { TextInput, View } from '@/ui/primitives';

const interests = ['Mental wellbeing', 'Sexual and reproductive health', 'Healthy living', 'Finding human support'];

export default function ProfileOnboardingScreen() {
  const { profile, updateProfile } = useAuthProfile();
  const [region, setRegion] = useState(profile.region ?? '');
  const toggleInterest = (interest: string) => void updateProfile({ supportInterests: profile.supportInterests.includes(interest) ? profile.supportInterests.filter(value => value !== interest) : [...profile.supportInterests, interest] });
  const continueNext = async () => { await updateProfile({ region: region.trim() || undefined }); router.push('/privacy'); };
  return <AuthScreen step={{ current: 4, total: 5 }} title="Set a few preferences" body="All choices are optional. They help Hashie present useful, respectful support.">
    <ChoiceButton label="Prefer voice-first support" hint="Show voice controls prominently when they are available." selected={profile.voiceFirst} onPress={() => void updateProfile({ voiceFirst: !profile.voiceFirst })} />
    <View accessibilityRole="radiogroup" className="gap-3">{interests.map(interest => <ChoiceButton key={interest} label={interest} hint="Optional support interest" selected={profile.supportInterests.includes(interest)} onPress={() => toggleInterest(interest)} />)}</View>
    <View className="gap-2"><TextInput accessibilityLabel="Optional region" accessibilityHint="Enter an optional region in Ghana for local support options" accessibilityState={{ disabled: false }} value={region} onChangeText={setRegion} placeholder="Optional region, for example Greater Accra" placeholderTextColor="#64748B" className="min-h-14 rounded-2xl border border-slate-300 bg-white px-4 text-base text-slate-950 dark:border-slate-600 dark:bg-slate-900 dark:text-white" /></View>
    <StatusMessage>Do not use this field for an address, health condition, or emergency details.</StatusMessage>
    <PrimaryButton label="Continue" hint="Save optional preferences and read privacy information" onPress={() => void continueNext()} />
    <SecondaryButton label="Skip for now" hint="Continue without optional preferences" onPress={() => router.push('/privacy')} />
    <SecondaryButton label="Back" hint="Return to accessibility preferences" onPress={() => goBackOrReplace('/accessibility')} />
  </AuthScreen>;
}
