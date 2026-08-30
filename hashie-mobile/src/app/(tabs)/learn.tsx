import { Stack } from 'expo-router';
import { useAuthProfile } from '@/auth/auth-context';
import { copy } from '@/content/copy';
import { ScrollView, Text, View } from '@/ui/primitives';

export default function LearnScreen() { const { profile } = useAuthProfile(); const text = copy[profile.language]; return <><Stack.Screen options={{ title: text.learn }} /><ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="mx-auto w-full max-w-2xl gap-4 px-5 pb-10 pt-6"><Text selectable accessibilityRole="header" className="text-3xl font-bold text-slate-950 dark:text-white">{text.learn}</Text><View className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><Text selectable className="text-base leading-6 text-slate-700 dark:text-slate-200">{text.comingSoon}</Text></View></ScrollView></>; }
